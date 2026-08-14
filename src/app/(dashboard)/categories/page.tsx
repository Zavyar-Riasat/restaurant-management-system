'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';
import axios from '@/lib/http';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [newCatStatus, setNewCatStatus] = useState('Active');
  
  const EMOJI_LIST = ['🍔', '🍕', '🥤', '🍟', '🍗', '🥩', '🥘', '🥙', '🍢', '🥣', '🥗', '☕', '🍦', '🍰', '🌶️', '🍚', '🏷️', '🥪', '🌯'];
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    setIsSubmitting(true);
    try {
      if (editingCatId) {
        await axios.patch(`/api/categories/${editingCatId}`, {
          name: newCatName,
          icon: newCatIcon,
          status: newCatStatus
        });
        toast.success('Category updated successfully');
      } else {
        await axios.post('/api/categories', {
          name: newCatName,
          icon: newCatIcon,
          status: newCatStatus
        });
        toast.success('Category added successfully');
      }
      setNewCatName('');
      setNewCatIcon('🏷️');
      setEditingCatId(null);
      setShowAddForm(false);
      fetchCategories(); // Refresh list
    } catch (error) {
      toast.error(editingCatId ? 'Failed to update category' : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (category: any) => {
    setNewCatName(category.name);
    setNewCatIcon(category.icon || '🏷️');
    setNewCatStatus(category.status);
    setEditingCatId(category._id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`/api/categories/${id}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Main Categories</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingCatId ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => {
              setShowAddForm(false);
              setEditingCatId(null);
              setNewCatName('');
              setNewCatIcon('🏷️');
            }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Category Name</label>
                <input 
                  type="text" 
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Fast Food" 
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div className="w-48 space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  value={newCatStatus}
                  onChange={(e) => setNewCatStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <label className="text-sm font-medium">Select Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_LIST.map(e => (
                  <button 
                    key={e} 
                    type="button"
                    onClick={() => setNewCatIcon(e)}
                    className={`text-2xl p-2 rounded-lg border transition-colors ${newCatIcon === e ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Category'}
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
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    No categories found. Add one above!
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                      <span className="text-2xl">{category.icon || '🏷️'}</span>
                      {category.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        category.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {category.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(category)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(category._id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={18} /></button>
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
