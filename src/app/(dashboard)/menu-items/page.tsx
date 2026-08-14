'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('none');
  const [status, setStatus] = useState('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sizeOptions = [
    { value: 'none', label: 'None' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'lg', label: 'LG' },
    { value: 'xl', label: 'XL' },
  ];

  const formatSize = (value?: string) => {
    if (!value || value === 'none') return 'None';
    if (value === 'lg') return 'LG';
    if (value === 'xl') return 'XL';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (category && subCategories.length > 0) {
      const filtered = subCategories.filter(cat => cat.mainCategory?._id === category || cat.mainCategory === category);
      if (filtered.length > 0 && !filtered.some(cat => cat._id === subCategory)) {
        setSubCategory(filtered[0]._id);
      }
    }
  }, [category, subCategories]);

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes, subCatsRes] = await Promise.all([
        axios.get('/api/menu-items'),
        axios.get('/api/categories'),
        axios.get('/api/sub-categories')
      ]);
      setMenuItems(itemsRes.data);
      setCategories(catsRes.data);
      setSubCategories(subCatsRes.data);
      if (catsRes.data.length > 0) {
        setCategory(catsRes.data[0]._id);
      }
      if (subCatsRes.data.length > 0) {
        setSubCategory(subCatsRes.data[0]._id);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setSize('none');
    setStatus('Active');
    setEditingItemId(null);
    setShowAddForm(false);
  };

  const handleEditClick = (item: any) => {
    setName(item.name || '');
    setCategory(item.mainCategory?._id || item.mainCategory || categories[0]?._id || '');
    setSubCategory(item.category?._id || item.category || subCategories[0]?._id || '');
    setPrice(String(item.price ?? ''));
    setSize(item.size || 'none');
    setStatus(item.status || 'Active');
    setEditingItemId(item._id);
    setShowAddForm(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;

    setIsSubmitting(true);
    try {
      if (editingItemId) {
        await axios.patch(`/api/menu-items/${editingItemId}`, {
          name,
          mainCategory: category,
          category: subCategory,
          price: Number(price),
          size,
          status
        });
        toast.success('Menu item updated successfully');
      } else {
        await axios.post('/api/menu-items', {
          name,
          mainCategory: category,
          category: subCategory,
          price: Number(price),
          size,
          status
        });
        toast.success('Menu item added successfully');
      }

      setName('');
      setPrice('');
      setSize('none');
      setStatus('Active');
      setEditingItemId(null);
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      toast.error(editingItemId ? 'Failed to update menu item' : 'Failed to add menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await axios.delete(`/api/menu-items/${id}`);
      toast.success('Menu item deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Menu Items</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus size={18} /> Add Menu Item
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingItemId ? 'Edit Menu Item' : 'New Menu Item'}</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Item Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Zinger Burger" 
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
              <label className="text-sm font-medium">Sub Category</label>
              <select 
                required
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {subCategories.filter(cat => cat.mainCategory?._id === category || cat.mainCategory === category).map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (Rs.)</label>
              <input 
                type="number" 
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="500" 
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sizeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center w-full"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : editingItemId ? 'Update' : 'Save'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Sub Category</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading menu items...
                  </td>
                </tr>
              ) : menuItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No menu items found. Add one above!
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => (
                  <tr key={item._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.mainCategory?.name || 'Uncategorized'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.category?.name || 'Uncategorized'}</td>
                    <td className="px-6 py-4 font-medium">Rs. {item.price}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatSize(item.size)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(item)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(item._id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={18} /></button>
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
