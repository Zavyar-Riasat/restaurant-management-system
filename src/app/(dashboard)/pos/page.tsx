'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, X, Printer, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { addItem, removeItem, updateQuantity, setDiscount, clearCart } from '@/store/slices/cartSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import { db } from '@/lib/localDb';

export default function POSPage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);
  
  const [categories, setCategories] = useState<{_id: string, name: string, icon?: string}[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [printOrder, setPrintOrder] = useState<any>(null);

  // New Customer Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [selectedDiscountCategories, setSelectedDiscountCategories] = useState<string[]>([]);

  const actualAmountPaid = amountPaidInput === '' ? cart.total : Number(amountPaidInput);
  const balanceDue = Math.max(0, cart.total - actualAmountPaid);

  const categoriesInCart = useMemo(() => {
    return Array.from(new Set(cart.items.map(cartItem => {
      const fullItem = menuItems.find(mi => mi._id === cartItem.id);
      return fullItem?.mainCategory?.name || 'Uncategorized';
    })));
  }, [cart.items, menuItems]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, itemsRes] = await Promise.all([
          axios.get('/api/categories', { timeout: 3000 }),
          axios.get('/api/menu-items', { timeout: 3000 })
        ]);
        setCategories(catsRes.data);
        setMenuItems(itemsRes.data);
        
        // Save to Local DB (IndexedDB) for offline use
        try {
          await db.categories.clear();
          await db.menuItems.clear();
          await db.categories.bulkAdd(catsRes.data);
          await db.menuItems.bulkAdd(itemsRes.data);
        } catch (e) {
          console.warn('Could not save to local DB:', e);
        }
      } catch (error) {
        // If network fails, try to load from Local DB!
        try {
          const localCats = await db.categories.toArray();
          const localItems = await db.menuItems.toArray();
          if (localCats.length > 0) {
            setCategories(localCats as any);
            setMenuItems(localItems as any);
            toast.success('Loaded menu from local offline storage');
          } else {
            toast.error('Network error and no offline data found');
          }
        } catch (dbErr) {
          toast.error('Failed to load menu data');
        }
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'All' || (item.mainCategory && item.mainCategory.name === activeCategory) || (!item.mainCategory && activeCategory === 'All');
    return matchesSearch && matchesCat && item.status === 'Active';
  });

  const handleAddToCart = (item: any) => {
    dispatch(addItem({
      id: item._id,
      name: item.name,
      price: item.discountPrice || item.price,
      image: item.image
    }));
    toast.success(`${item.name} added to cart`);
  };

  const handlePlaceOrder = async () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (balanceDue > 0 && !customerName.trim()) {
      toast.error('Customer Name is required for partial or unpaid orders');
      return;
    }

    if (cart.discountAmount > 0) {
      const validCategories = selectedDiscountCategories.filter(c => categoriesInCart.includes(c));
      if (validCategories.length === 0) {
        toast.error('You must select at least one category to allocate the discount to.');
        return;
      }
    }

    setIsSubmitting(true);
    
    let discountAllocation: Record<string, number> | undefined = undefined;
    if (cart.discountAmount > 0) {
      const validCategories = selectedDiscountCategories.filter(c => categoriesInCart.includes(c));
      discountAllocation = {};
      const amountPerCategory = cart.discountAmount / validCategories.length;
      validCategories.forEach(cat => {
        discountAllocation![cat] = amountPerCategory;
      });
    }

    const orderPayload = {
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      cashier: '60d0fe4f5311236168a109ca', // Dummy cashier ID for now until Auth is wired
      items: cart.items.map(item => ({
        menuItem: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions
      })),
      subtotal: cart.subtotal,
      discount: cart.discountAmount,
      discountAllocation,
      tax: 0,
      grandTotal: cart.total,
      amountPaid: actualAmountPaid,
    };

    try {
      if (!navigator.onLine) {
        throw new Error('OFFLINE_MODE');
      }
      
      const res = await axios.post('/api/orders', orderPayload, { timeout: 5000 });
      toast.success(`Order ${res.data.orderNumber} placed successfully!`);
      dispatch(clearCart());
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setAmountPaidInput('');
      
      // Print receipt trigger
      handlePrint(res.data);
    } catch (error: any) {
      if (error.message === 'OFFLINE_MODE' || error.code === 'ECONNABORTED' || !error.response) {
        // Save to local pendingOrders!
        const tempId = `OFFLINE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const offlineOrder = { ...orderPayload, tempId, createdAt: new Date().toISOString() };
        
        await db.pendingOrders.add(offlineOrder);
        toast.success(`Order saved offline (${tempId})! Will sync when connected.`, { duration: 5000 });
        
        dispatch(clearCart());
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setAmountPaidInput('');
        setSelectedDiscountCategories([]);
        
        handlePrint({ ...offlineOrder, orderNumber: tempId });
      } else {
        toast.error('Failed to place order on server');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (orderData?: any) => {
    // If orderData is provided (after placing order), use it
    // Otherwise, construct a temporary one from the cart state
    const dataToPrint = orderData || {
      orderNumber: 'DRAFT',
      createdAt: new Date().toISOString(),
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      items: cart.items.map(item => ({
        _id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: cart.subtotal,
      discount: cart.discountAmount,
      grandTotal: cart.total,
      amountPaid: actualAmountPaid,
      balanceDue: balanceDue,
      paymentHistory: []
    };
    
    setPrintOrder(dataToPrint);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <>
    <div className="h-full flex gap-6 print:hidden">
      {/* Left Column: Menu */}
      <div className="flex-1 flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
        {/* Search & Categories */}
        <div className="p-4 border-b border-border space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input 
              type="text" 
              placeholder="Search food items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === 'All' 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat._id}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeCategory === cat.name 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="text-lg">{cat.icon || '🏷️'}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Food Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loadingData ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div 
                  key={item._id} 
                  onClick={() => handleAddToCart(item)}
                  className="bg-background border border-border rounded-xl p-4 cursor-pointer hover:border-primary transition-colors group relative"
                >
                  <div className="aspect-square bg-secondary rounded-lg mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                    {item.image ? (
                       // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{item.category?.icon || '🏷️'}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-primary font-bold">Rs. {item.discountPrice || item.price}</p>
                    {item.discountPrice && (
                      <p className="text-xs text-muted-foreground line-through">Rs. {item.price}</p>
                    )}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-12">
                  No menu items found. Add some from the Menu Items tab!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className="w-[400px] flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/50 flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2 text-lg">
            <ShoppingBag size={20} /> Current Order
          </h2>
          <button 
            onClick={() => dispatch(clearCart())}
            className="text-xs text-destructive hover:underline"
          >
            Clear
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 opacity-50">
              <ShoppingBag size={48} />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map(item => (
                <div key={item.id} className="flex justify-between items-start gap-3 bg-background p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-primary font-bold text-sm">Rs. {item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
                    <button 
                      onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                      disabled={item.quantity <= 1}
                      className="p-1 rounded hover:bg-background disabled:opacity-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                      className="p-1 rounded hover:bg-background"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => dispatch(removeItem(item.id))}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              
              {/* Customer Info Form */}
              <div className="bg-background p-3 rounded-lg border border-border space-y-3 mt-4">
                <h4 className="text-sm font-bold text-foreground flex flex-wrap items-center justify-between gap-1">
                  Customer Info 
                  {balanceDue > 0 ? (
                    <span className="text-destructive text-[10px] uppercase tracking-wider">(Required for debt)</span>
                  ) : (
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">(Optional)</span>
                  )}
                </h4>
                <div className="relative">
                  <input 
                    type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className={`w-full px-3 py-2 bg-secondary border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary ${balanceDue > 0 && !customerName.trim() ? 'border-destructive/50 ring-1 ring-destructive/50' : 'border-border'}`}
                  />
                  {balanceDue > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive font-bold" title="Required">*</span>}
                </div>
                <input 
                  type="text" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input 
                  type="text" placeholder="Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Billing summary */}
        <div className="p-4 border-t border-border bg-secondary/30 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Discount Amount</span>
            <input 
              type="number"
              value={cart.discountAmount || ''}
              onChange={(e) => dispatch(setDiscount(Number(e.target.value)))}
              placeholder="0"
              className="w-20 text-right px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          {cart.discountAmount > 0 && (
            <div className="bg-background p-3 rounded-lg border border-destructive/20 mt-2 space-y-2 shadow-sm">
              <span className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                Allocate Discount To <span className="text-destructive text-[10px]">*</span>
              </span>
              <div className="space-y-1">
                {categoriesInCart.map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 p-1 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedDiscountCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDiscountCategories([...selectedDiscountCategories, cat]);
                        else setSelectedDiscountCategories(selectedDiscountCategories.filter(c => c !== cat));
                      }}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="font-medium text-foreground">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between text-sm pt-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">Rs. {cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm hidden">
            {/* Tax row hidden entirely */}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount applied</span>
            <span className="font-medium text-destructive">- Rs. {cart.discountAmount.toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-border flex justify-between items-end">
            <span className="font-bold text-foreground">Grand Total</span>
            <span className="text-xl font-black text-primary">Rs. {cart.total.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm pt-2">
            <span className="font-bold text-foreground">Amount Paid</span>
            <input 
              type="number"
              value={amountPaidInput}
              max={cart.total}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > cart.total) {
                  setAmountPaidInput(cart.total.toString());
                  toast.error("Amount paid cannot exceed grand total");
                } else {
                  setAmountPaidInput(e.target.value);
                }
              }}
              placeholder={cart.total.toFixed(2)}
              className="w-24 text-right px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary font-bold text-primary"
            />
          </div>
          
          {balanceDue > 0 && (
             <div className="flex justify-between text-sm">
               <span className="font-bold text-destructive">Balance Due (Debt)</span>
               <span className="font-bold text-destructive">Rs. {balanceDue.toFixed(2)}</span>
             </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
            <button 
              onClick={handlePrint}
              disabled={cart.items.length === 0}
              className="bg-secondary text-foreground py-3 rounded-lg font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Print
            </button>
            <button 
              onClick={handlePlaceOrder}
              disabled={cart.items.length === 0 || isSubmitting}
              className="bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Printable Receipt (Hidden by default, shown when printing) */}
    {printOrder && (
        <div className="hidden print:block fixed inset-0 bg-white text-black z-[9999] p-8 text-sm font-sans w-full h-full">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-black text-center mb-2">RestoPOS</h1>
            <p className="text-center text-gray-500 mb-6">Thank you for your visit!</p>

            <div className="border-b border-gray-300 pb-4 mb-4">
              <p><strong>Order ID:</strong> {printOrder.orderNumber}</p>
              <p><strong>Date:</strong> {new Date(printOrder.createdAt).toLocaleString()}</p>
              {printOrder.customerName && printOrder.customerName !== 'Walk-in Customer' && (
                <>
                  <p><strong>Customer:</strong> {printOrder.customerName}</p>
                  {printOrder.customerPhone && <p><strong>Phone:</strong> {printOrder.customerPhone}</p>}
                  {printOrder.customerAddress && <p><strong>Address:</strong> {printOrder.customerAddress}</p>}
                </>
              )}
            </div>

            <table className="w-full mb-4">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {printOrder.items?.map((item: any) => (
                  <tr key={item._id} className="border-b border-gray-100">
                    <td className="py-2">{item.name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">Rs. {(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-gray-300 pb-4 mb-4 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {printOrder.subtotal?.toFixed(2)}</span>
              </div>
              {printOrder.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>- Rs. {printOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-300">
                <span>Grand Total</span>
                <span>Rs. {printOrder.grandTotal?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-1">
               <h4 className="font-bold mb-2 uppercase text-xs text-gray-500 tracking-wider">Payment History</h4>
               {(() => {
                 const currentTotalPaid = printOrder.amountPaid !== undefined ? printOrder.amountPaid : printOrder.grandTotal;
                 const historySum = (printOrder.paymentHistory || []).reduce((sum: number, p: any) => sum + p.amount, 0);
                 const initialPayment = Math.max(0, currentTotalPaid - historySum);
                 
                 return (
                   <>
                     {initialPayment > 0 && (
                       <div className="flex justify-between text-sm text-gray-600">
                         <span>Initial Payment ({new Date(printOrder.createdAt).toLocaleDateString()})</span>
                         <span>Rs. {initialPayment.toFixed(2)}</span>
                       </div>
                     )}
                     {printOrder.paymentHistory?.map((p: any, i: number) => (
                       <div key={i} className="flex justify-between text-sm text-gray-600">
                         <span>Payment ({new Date(p.date).toLocaleString()})</span>
                         <span>Rs. {p.amount.toFixed(2)}</span>
                       </div>
                     ))}
                   </>
                 );
               })()}
               <div className="flex justify-between font-bold mt-2 border-t border-black pt-2">
                 <span>Balance Due</span>
                 <span>Rs. {(printOrder.balanceDue !== undefined ? printOrder.balanceDue : Math.max(0, printOrder.grandTotal - (printOrder.amountPaid || 0))).toFixed(2)}</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
