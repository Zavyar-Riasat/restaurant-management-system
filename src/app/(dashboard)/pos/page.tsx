'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ShoppingBag, Plus, Minus, X, Printer, Loader2, UserPlus, Check, PackageSearch } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { addItem, removeItem, updateQuantity, setDiscount, clearCart } from '@/store/slices/cartSlice';
import axios from '@/lib/http';
import toast from 'react-hot-toast';
import { db } from '@/lib/localDb';

export default function POSPage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.cart);

  const [categories, setCategories] = useState<{ _id: string, name: string, icon?: string }[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDealCategory, setActiveDealCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [printOrder, setPrintOrder] = useState<any>(null);
  // Tracks which copy is currently being printed: 'kitchen' -> 'customer' -> null (done)
  const [printStage, setPrintStage] = useState<'kitchen' | 'customer' | null>(null);

  // New Customer Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [selectedDiscountCategories, setSelectedDiscountCategories] = useState<string[]>([]);

  // Customer search / quick-add feature
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const customerBoxRef = useRef<HTMLDivElement>(null);

  const actualAmountPaid = amountPaidInput === '' ? cart.total : Number(amountPaidInput);
  const balanceDue = Math.max(0, cart.total - actualAmountPaid);
  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const categoriesInCart = useMemo(() => {
    return Array.from(new Set(cart.items.map(cartItem => {
      const fullItem = menuItems.find(mi => mi._id === cartItem.id);
      return fullItem?.mainCategory?.name || 'Uncategorized';
    })));
  }, [cart.items, menuItems]);

  // Auto-select every category in cart by default whenever a discount is
  // first entered, so the user isn't blocked by an empty checkbox list they
  // have to remember to fill in themselves.
  useEffect(() => {
    if (cart.discountAmount > 0 && selectedDiscountCategories.length === 0 && categoriesInCart.length > 0) {
      setSelectedDiscountCategories(categoriesInCart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.discountAmount]);

  // Quick map of cart quantity per item id, so menu cards can show a badge
  const cartQuantityById = useMemo(() => {
    const map: Record<string, number> = {};
    cart.items.forEach(i => { map[i.id] = i.quantity; });
    return map;
  }, [cart.items]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, itemsRes, dealsRes] = await Promise.all([
          axios.get('/api/categories', { timeout: 15000 }),
          axios.get('/api/menu-items', { timeout: 15000 }),
          axios.get('/api/deals', { timeout: 15000 })
        ]);
        setCategories(catsRes.data);
        setMenuItems(itemsRes.data);
        setDeals(dealsRes.data);

        // Save to Local DB (IndexedDB) for offline use
        try {
          await db.categories.clear();
          await db.menuItems.clear();
          await db.deals.clear();
          await db.categories.bulkAdd(catsRes.data);
          await db.menuItems.bulkAdd(itemsRes.data);
          await db.deals.bulkAdd(dealsRes.data);
        } catch (e) {
          console.warn('Could not save to local DB:', e);
        }
      } catch (error) {
        // If network fails, try to load from Local DB!
        try {
          const localCats = await db.categories.toArray();
          const localItems = await db.menuItems.toArray();
          const localDeals = await db.deals.toArray();
          if (localCats.length > 0) {
            setCategories(localCats as any);
            setMenuItems(localItems as any);
            setDeals(localDeals as any);
            toast.success('Loaded menu and deals from local offline storage');
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

  // Load existing customers for the search/select feature (separate from menu data above)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get('/api/customers', { timeout: 15000 });
        setAllCustomers(res.data || []);
      } catch (e) {
        console.warn('Could not load customers list:', e);
      }
    };
    fetchCustomers();
  }, []);

  // Close the customer dropdown when clicking anywhere outside the search box
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.toLowerCase();
    return allCustomers
      .filter(c => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customerSearchQuery, allCustomers]);

  const handleSelectCustomer = (customer: any) => {
    setCustomerName(customer.name || '');
    setCustomerPhone(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setSelectedCustomerId(customer._id || null);
    setCustomerSearchQuery('');
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSelectedCustomerId(null);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const res = await axios.post('/api/customers', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        address: newCustomerAddress.trim(),
        email: newCustomerEmail.trim(),
      });
      const created = res.data;
      setAllCustomers(prev => [created, ...prev]);
      // Auto-fill the order's customer fields with the newly created customer
      setCustomerName(created.name || '');
      setCustomerPhone(created.phone || '');
      setCustomerAddress(created.address || '');
      setSelectedCustomerId(created._id || null);
      toast.success('Customer added');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerAddress('');
      setNewCustomerEmail('');
      setShowAddCustomerForm(false);
    } catch (e: any) {
      toast.error('Failed to add customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

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
    toast.success(`${item.name} added to cart`, { id: `add-${item._id}` });
  };

  const handleAddDealToCart = (deal: any) => {
    dispatch(addItem({
      id: deal._id,
      name: deal.name,
      price: deal.price,
      image: deal.image,
      specialInstructions: deal.description || 'Deal combo'
    }));
    toast.success(`${deal.name} added to cart`, { id: `add-${deal._id}` });
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
      items: cart.items.map(item => {
        const isDeal = deals.some(d => d._id === item.id);
        return {
          [isDeal ? 'deal' : 'menuItem']: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        };
      }),
      subtotal: cart.subtotal,
      discount: cart.discountAmount,
      discountAllocation,
      tax: 0,
      grandTotal: cart.total,
      amountPaid: actualAmountPaid,
    };

    try {
      const res = await axios.post('/api/orders', orderPayload, { timeout: 5000 });
      const queuedOffline = res.headers?.['x-offline-queued'] === 'true';
      if (queuedOffline) {
        toast.success(`Order ${res.data.orderNumber} saved offline and queued for sync.`, { duration: 5000 });
      } else {
        toast.success(`Order ${res.data.orderNumber} placed successfully!`);
      }
      dispatch(clearCart());
      handleClearCustomer();
      setAmountPaidInput('');
      setSelectedDiscountCategories([]);

      // Print receipt trigger
      handlePrint(res.data);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || !error.response) {
        // Save to local pendingOrders!
        const tempId = `OFFLINE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const offlineOrder = { ...orderPayload, tempId, createdAt: new Date().toISOString() };

        await db.pendingOrders.add(offlineOrder);
        toast.success(`Order saved offline (${tempId})! Will sync when connected.`, { duration: 5000 });

        dispatch(clearCart());
        handleClearCustomer();
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
    // Dismiss any lingering toast popups so they never get captured in the print
    toast.dismiss();

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
    // Start the sequential print flow with the Kitchen copy first.
    // The Customer copy is triggered automatically afterwards (see the
    // afterprint listener below) once the Kitchen copy job/cut is done.
    setPrintStage('kitchen');
  };

  // Fires window.print() whenever printStage moves to 'kitchen' or 'customer',
  // giving the DOM a brief moment to render the correct single copy first.
  useEffect(() => {
    if (!printOrder || !printStage) return;
    const t = setTimeout(() => {
      window.print();
    }, 150);
    return () => clearTimeout(t);
  }, [printStage, printOrder]);

  // Listens for the print dialog/job closing. When the Kitchen copy job
  // finishes (paper cuts), it automatically advances to the Customer copy,
  // which triggers the effect above to print it as its own separate job.
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintStage(prev => {
        if (prev === 'kitchen') return 'customer';
        return null; // Customer copy done, clear the printable content
      });
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const [showMobileCart, setShowMobileCart] = useState(false);

  // Single Receipt Component with everything inside
  const ReceiptContent = ({ copyLabel }: { copyLabel: string }) => (
    <div className="max-w-md mx-auto" style={{ padding: '20px' }}>
      <h1 className="text-3xl font-black text-center mb-2">Sangat Cafe</h1>
      <p className="text-center text-gray-500 mb-1">Thank you for your visit!</p>
      <p className="text-center text-xs font-semibold uppercase tracking-widest mb-6">{copyLabel}</p>

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

      {/* Footer - Always at the bottom */}
      <div className="text-center text-[11px] text-gray-500 mt-6 pt-3 border-t border-gray-200">
        Software developed by: Rana Zavyar 03045087177
      </div>
    </div>
  );

  return (
    <>
      <style jsx global>{`
   @media print {
  @page {
    size: 80mm auto;   /* match your printer's roll width; use 58mm if that's your printer */
    margin: 0;
  }

  html, body {
    height: auto !important;
    overflow: visible !important;
  }

  body * {
    visibility: hidden;
  }
  #printable-receipt, #printable-receipt * {
    visibility: visible;
  }
  #printable-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: auto !important;
  }

  .receipt-page {
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    display: block !important;
    width: 80mm; /* match @page size */
  }

  .receipt-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .receipt-content {
    display: block !important;
    height: auto !important;
  }
}
        @keyframes pos-pop {
          0% { transform: scale(1); }
          40% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .pos-card-active {
          animation: pos-pop 0.22s ease-out;
        }
      `}</style>

      <div className="h-full flex flex-col lg:flex-row gap-6 print:hidden relative">
        {/* Left Column: Menu */}
        <div className="flex-1 flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden min-w-0">
          {/* Search & Categories */}
          <div className="p-4 border-b border-border space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-background"
                >
                  <X size={14} />
                </button>
              )}
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
              <button
                onClick={() => setActiveCategory('Deals')}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeCategory === 'Deals'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="text-lg">🔥</span> Deals
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

            {/* Deals Sub-filter */}
            {activeCategory === 'Deals' && (
              <div className="flex gap-2 overflow-x-auto pt-3 border-t border-border scrollbar-hide items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-2">Filter Deals:</span>
                <button
                  onClick={() => setActiveDealCategory('All')}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                    activeDealCategory === 'All'
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={`deal-cat-${cat._id}`}
                    onClick={() => setActiveDealCategory(cat._id)}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeDealCategory === cat._id
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <span>{cat.icon || '🏷️'}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Food Grid */}
          <div className="flex-1 p-4 overflow-y-auto pb-24 lg:pb-4">
            {loadingData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-background border border-border rounded-xl p-4 animate-pulse">
                    <div className="aspect-square bg-secondary rounded-lg mb-3" />
                    <div className="h-3.5 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-secondary rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {activeCategory === 'Deals' ? (
                  deals.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground py-12 gap-2">
                      <PackageSearch size={36} className="opacity-40" />
                      <p>No deals found. Add some from the Deals tab!</p>
                    </div>
                  ) : (
                    deals.filter(d => {
                      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCat = activeDealCategory === 'All' || (d.category?._id === activeDealCategory) || (d.category === activeDealCategory);
                      return matchesSearch && matchesCat && d.status === 'Active';
                    }).map(deal => {
                      const qty = cartQuantityById[deal._id];
                      return (
                        <div
                          key={deal._id}
                          onClick={() => handleAddDealToCart(deal)}
                          className={`bg-background border rounded-xl p-4 cursor-pointer transition-all group relative select-none active:scale-[0.98] ${
                            qty ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary'
                          }`}
                        >
                          {qty > 0 && (
                            <span className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md">
                              {qty}
                            </span>
                          )}
                          <div className="aspect-square bg-secondary rounded-lg mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                            {deal.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={deal.image} alt={deal.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl">🔥</span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-foreground truncate">{deal.name}</h3>
                          <p className="text-xs text-muted-foreground truncate mb-1">{deal.description || 'Combo Deal'}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-primary font-bold">Rs. {deal.price}</p>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  <>
                    {filteredItems.map(item => {
                      const sizeLabel = item.size && item.size !== 'none' ? item.size.toUpperCase() : null;
                      const qty = cartQuantityById[item._id];

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleAddToCart(item)}
                          className={`bg-background border rounded-xl p-4 cursor-pointer transition-all group relative select-none active:scale-[0.98] ${
                            qty ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary'
                          }`}
                        >
                          {qty > 0 && (
                            <span className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md">
                              {qty}
                            </span>
                          )}
                          {sizeLabel && (
                            <div className="mb-2 flex justify-start">
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary border border-primary/20">
                                {sizeLabel === 'LG' ? 'LG' : sizeLabel === 'XL' ? 'XL' : sizeLabel}
                              </span>
                            </div>
                          )}
                          <div className="aspect-square bg-secondary rounded-lg mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl">{item.category?.icon || '🏷️'}</span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-primary font-bold">Rs. {item.discountPrice || item.price}</p>
                            {item.discountPrice && (
                              <p className="text-xs text-muted-foreground line-through">Rs. {item.price}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground py-12 gap-2">
                        <PackageSearch size={36} className="opacity-40" />
                        <p>{searchQuery ? `No items match "${searchQuery}"` : 'No menu items found. Add some from the Menu Items tab!'}</p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-primary text-sm font-medium hover:underline"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cart Floating Button */}
        {!showMobileCart && (
          <button
            onClick={() => setShowMobileCart(true)}
            className="lg:hidden fixed bottom-6 right-6 z-30 bg-primary text-primary-foreground px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 active:scale-95 transition-transform"
          >
            <div className="relative">
              <ShoppingBag size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-primary">
                  {cartItemCount}
                </span>
              )}
            </div>
            <span className="font-bold text-lg border-l border-primary-foreground/30 pl-3">Rs. {cart.total.toFixed(0)}</span>
          </button>
        )}

        {/* Right Column: Cart (Desktop) / Bottom Sheet (Mobile) */}
        <div className={`
          fixed inset-0 z-50 bg-background flex flex-col transition-transform duration-300
          lg:relative lg:inset-auto lg:w-[400px] lg:translate-y-0 lg:flex lg:h-full lg:bg-card lg:rounded-xl lg:border lg:border-border lg:overflow-hidden
          ${showMobileCart ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        `}>
          {/* Mobile drag handle */}
          <div className="lg:hidden pt-2 pb-1 flex justify-center bg-secondary/50">
            <div className="w-10 h-1.5 rounded-full bg-border" />
          </div>

          <div className="p-4 border-b border-border bg-secondary/50 flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2 text-lg">
              <ShoppingBag size={20} /> Current Order
              {cartItemCount > 0 && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-4">
              {cart.items.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear the entire cart?')) dispatch(clearCart());
                  }}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear
                </button>
              )}
              <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-2 -mr-2 text-muted-foreground bg-background rounded-full border border-border">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 opacity-60">
                <ShoppingBag size={48} />
                <p>Cart is empty</p>
                <p className="text-xs">Tap any item on the left to add it</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-3 bg-background p-3 rounded-lg border border-border">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-primary font-bold text-sm">Rs. {item.price * item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-secondary rounded-lg p-1 shrink-0">
                      <button
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease ${item.name} quantity`}
                        className="p-1 rounded hover:bg-background disabled:opacity-50"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                        aria-label={`Increase ${item.name} quantity`}
                        className="p-1 rounded hover:bg-background"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => dispatch(removeItem(item.id))}
                      aria-label={`Remove ${item.name} from cart`}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
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

                  {/* Selected customer chip */}
                  {selectedCustomerId && customerName && (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Check size={14} className="text-primary shrink-0" />
                        <span className="text-sm font-medium truncate">{customerName}</span>
                        {customerPhone && <span className="text-xs text-muted-foreground truncate">· {customerPhone}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCustomer}
                        aria-label="Clear selected customer"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Search existing customers / quick-add a new one */}
                  <div className="relative" ref={customerBoxRef}>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                          type="text"
                          placeholder="Search existing customers..."
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomerForm(prev => !prev)}
                        className={`shrink-0 px-3 py-2 rounded text-sm font-medium flex items-center gap-1.5 transition-colors ${
                          showAddCustomerForm
                            ? 'bg-secondary text-foreground hover:bg-secondary/80'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        <UserPlus size={14} /> {showAddCustomerForm ? 'Close' : 'Add'}
                      </button>
                    </div>

                    {showCustomerDropdown && customerSearchQuery.trim() && (
                      <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No matching customers</div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <button
                              type="button"
                              key={c._id}
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex flex-col"
                            >
                              <span className="font-medium">{c.name}</span>
                              {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {showAddCustomerForm && (
                    <div className="bg-secondary/40 p-3 rounded-lg border border-border space-y-2">
                      <input
                        type="text" placeholder="New Customer Name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text" placeholder="Phone Number" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text" placeholder="Address" value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text" placeholder="Email (optional)" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddNewCustomer}
                          disabled={isSavingCustomer}
                          className="flex-1 bg-primary text-primary-foreground py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSavingCustomer ? <Loader2 className="animate-spin" size={14} /> : 'Save Customer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddCustomerForm(false)}
                          className="px-3 py-2 bg-secondary text-foreground rounded text-sm font-medium hover:bg-secondary/80 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="text" placeholder="Customer Name" value={customerName}
                      onChange={e => { setCustomerName(e.target.value); setSelectedCustomerId(null); }}
                      className={`w-full px-3 py-2 bg-secondary border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary ${balanceDue > 0 && !customerName.trim() ? 'border-destructive/50 ring-1 ring-destructive/50' : 'border-border'}`}
                    />
                    {balanceDue > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive font-bold" title="Required">*</span>}
                  </div>
                  <input
                    type="text" placeholder="Phone Number" value={customerPhone}
                    onChange={e => { setCustomerPhone(e.target.value); setSelectedCustomerId(null); }}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text" placeholder="Address" value={customerAddress}
                    onChange={e => { setCustomerAddress(e.target.value); setSelectedCustomerId(null); }}
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
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={cart.discountAmount || ''}
                  onChange={(e) => dispatch(setDiscount(Number(e.target.value)))}
                  placeholder="0"
                  className="w-20 text-right px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {cart.discountAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => { dispatch(setDiscount(0)); setSelectedDiscountCategories([]); }}
                    aria-label="Clear discount"
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {cart.discountAmount > 0 && (
              <div className="bg-background p-3 rounded-lg border border-destructive/20 mt-2 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                    Allocate Discount To <span className="text-destructive text-[10px]">*</span>
                  </span>
                  {selectedDiscountCategories.length < categoriesInCart.length ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDiscountCategories(categoriesInCart)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Select all
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedDiscountCategories([])}
                      className="text-[11px] font-medium text-muted-foreground hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
              <div className="flex items-center gap-1.5">
                {amountPaidInput !== '' && Number(amountPaidInput) !== cart.total && (
                  <button
                    type="button"
                    onClick={() => setAmountPaidInput('')}
                    className="text-[11px] font-medium text-primary hover:underline whitespace-nowrap"
                  >
                    Full amt
                  </button>
                )}
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
            </div>

            {balanceDue > 0 && (
              <div className="flex justify-between text-sm bg-destructive/10 -mx-1 px-1 py-1.5 rounded">
                <span className="font-bold text-destructive">Balance Due (Debt)</span>
                <span className="font-bold text-destructive">Rs. {balanceDue.toFixed(2)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
              <button
                onClick={() => handlePrint()}
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

      {/* Printable Receipt - Only the current stage's copy is rendered, so each
          copy prints as its own separate job/cut. See printStage state + the
          two useEffects above for the automatic Kitchen -> Customer sequence. */}
      {printOrder && printStage && (
        <div id="printable-receipt" className="hidden print:block bg-white text-black text-sm font-sans">
          {printStage === 'kitchen' && (
            <div className="receipt-page">
              <div className="receipt-content">
                <ReceiptContent copyLabel="KITCHEN COPY" />
              </div>
            </div>
          )}

          {printStage === 'customer' && (
            <div className="receipt-page">
              <div className="receipt-content">
                <ReceiptContent copyLabel="CUSTOMER COPY" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
