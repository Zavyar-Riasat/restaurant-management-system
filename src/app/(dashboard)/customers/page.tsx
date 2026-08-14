'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Loader2, X, Trash2, CheckCircle } from 'lucide-react';
import axios from '@/lib/http';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payingCustomerId, setPayingCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);
    try {
      await axios.post('/api/customers', { name, phone, address });
      toast.success('Customer added successfully');
      setName('');
      setPhone('');
      setAddress('');
      setShowAddForm(false);
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await axios.delete(`/api/customers/${id}`);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const submitPayment = async () => {
    if (!payingCustomerId || !paymentAmount) return;
    try {
      const res = await axios.patch(`/api/customers/${payingCustomerId}`, { action: 'pay_balance', paymentAmount });
      toast.success('Payment added successfully!');
      setCustomers(customers.map(c => c._id === payingCustomerId ? res.data : c));
      setPayingCustomerId(null);
      setPaymentAmount('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">New Customer</h3>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </div>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save'}
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
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Outstanding Balance</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No customers found.</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{customer.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{customer.phone}</td>
                    <td className="px-6 py-4 font-medium">
                      <span className={customer.outstandingBalance > 0 ? 'text-destructive font-bold' : 'text-green-500'}>
                        Rs. {customer.outstandingBalance}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {customer.outstandingBalance > 0 && (
                          <button 
                            onClick={() => { setPayingCustomerId(customer._id); setPaymentAmount(customer.outstandingBalance.toString()); }}
                            title="Add Payment"
                            className="p-1.5 text-muted-foreground hover:text-green-600 rounded-md hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(customer._id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {payingCustomerId && (() => {
        const customerToPay = customers.find(c => c._id === payingCustomerId);
        const owes = customerToPay ? customerToPay.outstandingBalance : 0;
        
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl border border-border w-96 shadow-xl space-y-4">
            <h3 className="font-bold text-lg">Pay Customer Balance</h3>
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm font-medium">
              Outstanding Balance: Rs. {owes.toFixed(2)}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Amount Paying Now (Rs.)</label>
              <input 
                type="number" 
                value={paymentAmount} 
                max={owes}
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val > owes) {
                    setPaymentAmount(owes.toString());
                    toast.error("Payment cannot exceed outstanding balance");
                  } else {
                    setPaymentAmount(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setPayingCustomerId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitPayment}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Submit Payment
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
