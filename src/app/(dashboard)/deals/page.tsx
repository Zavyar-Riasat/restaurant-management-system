'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X, PlusCircle, MinusCircle } from 'lucide-react';
import axios from '@/lib/http';
import toast from 'react-hot-toast';

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [includedItems, setIncludedItems] = useState<{menuItem: string, customName: string, quantity: number, source: 'menu' | 'custom'}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dealsRes, itemsRes, catsRes] = await Promise.all([
        axios.get('/api/deals'),
        axios.get('/api/menu-items'),
        axios.get('/api/categories')
      ]);
      setDeals(dealsRes.data);
      setMenuItems(itemsRes.data);
      setCategories(catsRes.data);
      if (catsRes.data.length > 0) {
        setCategory(catsRes.data[0]._id);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncludedItem = () => {
    setIncludedItems([
      ...includedItems,
      { menuItem: '', customName: '', quantity: 1, source: 'custom' }
    ]);
  };

  const updateIncludedItem = (index: number, field: string, value: any) => {
    const newItems = [...includedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setIncludedItems(newItems);
  };

  const removeIncludedItem = (index: number) => {
    const newItems = [...includedItems];
    newItems.splice(index, 1);
    setIncludedItems(newItems);
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    const normalizedIncludedItems = includedItems
      .map(item => {
        const selectedItem = menuItems.find(mi => mi._id === item.menuItem);
        const finalName = (item.source === 'custom' ? item.customName : selectedItem?.name || item.customName || '').trim();

        if (!finalName) return null;

        return {
          menuItem: item.source === 'menu' ? (selectedItem?._id || null) : null,
          customName: finalName,
          quantity: Number(item.quantity) || 1
        };
      })
      .filter(Boolean) as Array<{ menuItem: string | null; customName: string; quantity: number }>;

    if (normalizedIncludedItems.length === 0) {
      toast.error('Please add at least one item to the deal');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/deals', {
        name,
        category,
        price: Number(price),
        discount: Number(discount),
        description,
        includedItems: normalizedIncludedItems,
        status
      });
      toast.success('Deal added successfully');
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to add deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      await axios.delete(`/api/deals/${id}`);
      toast.success('Deal deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const resetForm = () => {
    setName('');
    if (categories.length > 0) {
      setCategory(categories[0]._id);
    }
    setPrice('');
    setDiscount('0');
    setDescription('');
    setIncludedItems([]);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Deals & Combos</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus size={18} /> Add Deal
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">New Deal</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <form onSubmit={handleAddDeal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Deal Name</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Combo" 
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select 
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deal Price (Rs.)</label>
                <input 
                  type="number" required value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="1500" 
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount (Optional)</label>
                <input 
                  type="number" value={discount} onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0" 
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div className="space-y-2 lg:col-span-3">
                <label className="text-sm font-medium">Description</label>
                <input 
                  type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 2 Zinger Burgers + 1 Liter Drink" 
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">Included Items</label>
                <button type="button" onClick={handleAddIncludedItem} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  <PlusCircle size={14} /> Add Item
                </button>
              </div>
              
              {includedItems.length === 0 && (
                <p className="text-xs text-muted-foreground italic mb-2">No items added to this deal yet.</p>
              )}
              
              <div className="space-y-2">
                {includedItems.map((incItem, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-secondary/50 p-2 rounded-lg border border-border">
                    <select
                      value={incItem.source}
                      onChange={(e) => {
                        const nextSource = e.target.value as 'menu' | 'custom';
                        const nextItem = { ...incItem, source: nextSource };

                        if (nextSource === 'menu' && menuItems[0]) {
                          nextItem.menuItem = menuItems[0]._id;
                          nextItem.customName = menuItems[0].name;
                        } else if (nextSource === 'custom') {
                          nextItem.menuItem = '';
                          nextItem.customName = '';
                        }

                        updateIncludedItem(idx, 'source', nextSource);
                        updateIncludedItem(idx, 'menuItem', nextItem.menuItem);
                        updateIncludedItem(idx, 'customName', nextItem.customName);
                      }}
                      className="w-40 px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="menu">From menu</option>
                      <option value="custom">Write custom</option>
                    </select>

                    {incItem.source === 'menu' ? (
                      <select
                        value={incItem.menuItem}
                        onChange={(e) => {
                          const selectedItem = menuItems.find(mi => mi._id === e.target.value);
                          updateIncludedItem(idx, 'menuItem', e.target.value);
                          if (selectedItem) {
                            updateIncludedItem(idx, 'customName', selectedItem.name);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {menuItems.map(mi => (
                          <option key={mi._id} value={mi._id}>{mi.name} (Rs. {mi.price})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={incItem.customName}
                        onChange={(e) => updateIncludedItem(idx, 'customName', e.target.value)}
                        placeholder="Type item name manually"
                        className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}

                    <input 
                      type="number" min="1" value={incItem.quantity} onChange={(e) => updateIncludedItem(idx, 'quantity', Number(e.target.value))}
                      className="w-20 px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center"
                    />
                    <button type="button" onClick={() => removeIncludedItem(idx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded">
                      <MinusCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground px-8 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Deal'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
              <tr>
                <th className="px-6 py-4 font-medium">Deal Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Items Included</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading deals...
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No deals found. Add one above!
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div>{deal.name}</div>
                      {deal.description && <div className="text-xs text-muted-foreground font-normal">{deal.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {deal.category?.name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4">
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {deal.includedItems?.map((item: any, i: number) => (
                          <li key={i}>{item.quantity}x {item.customName || item.menuItem?.name || 'Unknown Item'}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 font-medium">Rs. {deal.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        deal.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDelete(deal._id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
