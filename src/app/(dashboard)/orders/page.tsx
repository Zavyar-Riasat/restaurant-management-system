'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Eye, Printer, Loader2, Trash2, CheckCircle, X, Lock } from 'lucide-react';
import axios from '@/lib/http';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [detailsOrder, setDetailsOrder] = useState<any>(null);
  const [selectedPartition, setSelectedPartition] = useState<string | null>(null);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);

  // Password-protected delete: which order is pending deletion, the entered
  // password, and whether we're mid-verification. Kept separate from
  // everything else so no existing logic is touched.
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [isVerifyingDelete, setIsVerifyingDelete] = useState(false);

  const getTodayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  };
  const getTodayEnd = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  };

  const [startDate, setStartDate] = useState(getTodayStart());
  const [endDate, setEndDate] = useState(getTodayEnd());
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await axios.get(`/api/orders?${params.toString()}`);
      setOrders(res.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [startDate, endDate]);

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/orders/${id}`);
      toast.success('Order deleted successfully');
      setOrders(orders.filter(o => o._id !== id));
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  // Opens the password-confirmation modal for a given order instead of
  // deleting immediately.
  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeletePasswordInput('');
  };

  // Verifies the entered password against the admin-configured delete
  // password (server-side, via /api/settings/verify-delete-password) and
  // only calls the existing handleDelete if it's correct.
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsVerifyingDelete(true);
    try {
      const res = await axios.post('/api/settings/verify-delete-password', { password: deletePasswordInput });
      if (res.data?.valid) {
        await handleDelete(deleteTargetId);
        setDeleteTargetId(null);
        setDeletePasswordInput('');
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      toast.error('Failed to verify password');
    } finally {
      setIsVerifyingDelete(false);
    }
  };

  const submitPayment = async () => {
    if (!payingOrderId || !paymentAmount) return;
    try {
      const res = await axios.patch(`/api/orders/${payingOrderId}`, { action: 'pay_balance', paymentAmount });
      toast.success('Payment added successfully!');
      setOrders(orders.map(o => o._id === payingOrderId ? res.data : o));
      setPayingOrderId(null);
      setPaymentAmount('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add payment');
    }
  };

  const handlePrintReceipt = (order: any) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const partitionSales = orders.reduce((acc, order) => {
    if (order.status === 'Cancelled') return acc;
    order.items.forEach((item: any) => {
      const catName = item.menuItem?.mainCategory?.name || 'Uncategorized';
      acc[catName] = (acc[catName] || 0) + (item.price * item.quantity);
    });
    if (order.discountAllocation) {
      Object.entries(order.discountAllocation).forEach(([catName, discountAmount]) => {
        if (acc[catName] !== undefined) {
          acc[catName] -= Number(discountAmount);
        } else {
          acc[catName] = -Number(discountAmount);
        }
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const totalSales = orders.reduce((sum, order) => {
    if (order.status === 'Cancelled') return sum;
    return sum + order.grandTotal;
  }, 0);

  const totalUnpaid = orders.reduce((sum, order) => {
    if (order.status === 'Cancelled') return sum;
    const owes = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - (order.amountPaid || 0));
    return sum + owes;
  }, 0);

  const unpaidOrdersList = useMemo(() => {
    return orders.filter(order => {
      if (order.status === 'Cancelled') return false;
      const owes = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - (order.amountPaid || 0));
      return owes > 0;
    }).map(order => {
      const owes = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - (order.amountPaid || 0));
      return { ...order, owes };
    }).sort((a, b) => b.owes - a.owes);
  }, [orders]);

  const partitionItemDetails = useMemo(() => {
    if (!selectedPartition) return { items: [], allocatedDiscount: 0, orderIds: [] };
    
    const itemsMap: Record<string, { name: string, quantity: number, total: number }> = {};
    let allocatedDiscount = 0;
    const orderIds = new Set<string>();
    
    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      
      let hasPartitionItems = false;
      order.items.forEach((item: any) => {
        const catName = item.menuItem?.mainCategory?.name || 'Uncategorized';
        if (catName === selectedPartition) {
          hasPartitionItems = true;
          if (!itemsMap[item.name]) {
            itemsMap[item.name] = { name: item.name, quantity: 0, total: 0 };
          }
          itemsMap[item.name].quantity += item.quantity;
          itemsMap[item.name].total += (item.price * item.quantity);
        }
      });

      if (hasPartitionItems) {
        orderIds.add(order.orderNumber);
      }

      if (order.discountAllocation && order.discountAllocation[selectedPartition]) {
        allocatedDiscount += Number(order.discountAllocation[selectedPartition]);
        orderIds.add(order.orderNumber);
      }
    });
    
    return {
      items: Object.values(itemsMap).sort((a, b) => b.total - a.total),
      allocatedDiscount,
      orderIds: Array.from(orderIds)
    };
  }, [orders, selectedPartition]);

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Order Management</h1>
          <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Start Date/Time</label>
              <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer" />
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">End Date/Time</label>
              <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Partition Sales Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 flex flex-col justify-center items-center shadow-sm">
            <h3 className="text-sm font-bold uppercase text-primary tracking-wider mb-2">Total Sales</h3>
            <p className="text-4xl font-black text-primary">Rs. {totalSales.toFixed(2)}</p>
          </div>
          <div 
            onClick={() => setShowUnpaidModal(true)}
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 flex flex-col justify-center items-center shadow-sm cursor-pointer hover:bg-destructive/20 transition-colors"
          >
            <h3 className="text-sm font-bold uppercase text-destructive tracking-wider mb-2">Unpaid Balance</h3>
            <p className="text-4xl font-black text-destructive">Rs. {totalUnpaid.toFixed(2)}</p>
            <p className="text-xs text-destructive/80 mt-2 font-medium">Click for details</p>
          </div>
          {Object.entries(partitionSales).map(([cat, total]: [string, any]) => (
            <div 
              key={cat} 
              onClick={() => setSelectedPartition(cat)}
              className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col justify-center items-center shadow-sm cursor-pointer hover:bg-primary/10 transition-colors"
            >
              <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-2">{cat} Sales</h3>
              <p className="text-3xl font-black text-primary">Rs. {total.toFixed(2)}</p>
              <p className="text-xs text-primary/80 mt-2 font-medium">Click for details</p>
            </div>
          ))}
          {Object.keys(partitionSales).length === 0 && !loading && totalSales === 0 && (
             <div className="col-span-full text-center text-muted-foreground py-8 bg-card rounded-xl border border-border">
               No sales data for this period.
             </div>
          )}
        </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Search orders..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80">
            <Filter size={16} /> Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
              <tr>
                <th className="px-6 py-4 font-medium">Order ID</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No orders found. Place an order from the POS!
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const owes = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - (order.amountPaid || 0));
                  return (
                  <tr key={order._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-6 py-4">{order.customerName}</td>
                    <td className="px-6 py-4 font-medium">Rs. {order.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Ready' || order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' :
                        order.status === 'Preparing' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${
                        order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 
                        order.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.paymentStatus}
                        {owes > 0 && ` (Owes Rs. ${owes})`}
                      </span>
                      {order.balancePaidDate && (
                         <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                           Balance Paid: {new Date(order.balancePaidDate).toLocaleDateString()}
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {order.paymentStatus === 'Partially Paid' && (
                          <button 
                            onClick={() => { setPayingOrderId(order._id); setPaymentAmount(owes.toString()); }}
                            title="Add Payment"
                            className="p-1.5 text-muted-foreground hover:text-green-600 rounded-md hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-md hover:bg-blue-100 transition-colors" onClick={() => setDetailsOrder(order)} title="View Details"><Eye size={18} /></button>
                        <button className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors" onClick={() => handlePrintReceipt(order)}><Printer size={18} /></button>
                        <button onClick={() => requestDelete(order._id)} title="Delete Order" className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Delete Order - Password Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-card p-6 rounded-xl border border-border w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-destructive flex items-center gap-2">
              <Lock size={18} /> Confirm Delete
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter the admin password to delete this order. This action cannot be undone.
            </p>
            <input
              type="password"
              autoFocus
              value={deletePasswordInput}
              onChange={(e) => setDeletePasswordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmDelete(); }}
              placeholder="Admin password"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setDeleteTargetId(null); setDeletePasswordInput(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isVerifyingDelete}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isVerifyingDelete ? <Loader2 className="animate-spin" size={16} /> : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingOrderId && (() => {
        const orderToPay = orders.find(o => o._id === payingOrderId);
        const owes = orderToPay ? (orderToPay.balanceDue !== undefined ? orderToPay.balanceDue : Math.max(0, orderToPay.grandTotal - (orderToPay.amountPaid || 0))) : 0;
        
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-xl border border-border w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-lg">Add Payment</h3>
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm font-medium">
              Remaining Balance: Rs. {owes.toFixed(2)}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Amount Paying Now (Rs.)</label>
              <input 
                type="number" 
                value={paymentAmount} 
                max={owes}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setPayingOrderId(null)}
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

      {/* Order Details Modal */}
      {detailsOrder && (() => {
        const groupedItems = detailsOrder.items.reduce((acc: any, item: any) => {
          const catName = item.menuItem?.mainCategory?.name || 'Uncategorized';
          if (!acc[catName]) acc[catName] = { total: 0, items: [], allocatedDiscount: 0 };
          acc[catName].items.push(item);
          acc[catName].total += (item.price * item.quantity);
          return acc;
        }, {} as Record<string, { total: number, items: any[], allocatedDiscount: number }>);

        if (detailsOrder.discountAllocation) {
          Object.entries(detailsOrder.discountAllocation).forEach(([catName, discount]: [string, any]) => {
            if (groupedItems[catName]) {
               groupedItems[catName].allocatedDiscount = Number(discount);
            }
          });
        }

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-xl">Order Details ({detailsOrder.orderNumber})</h3>
                <button onClick={() => setDetailsOrder(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div>
                  <h4 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-3">Partition Breakdown</h4>
                  <div className="space-y-4">
                    {Object.entries(groupedItems).map(([catName, data]: [string, any]) => (
                      <div key={catName} className="border border-border rounded-lg p-4 bg-secondary/20">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-bold text-lg text-primary">{catName}</h5>
                          <span className="font-bold bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                            Total: Rs. {(data.total - (data.allocatedDiscount || 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-background border-y border-border">
                              <tr>
                                <th className="px-3 py-2 font-medium">Item</th>
                                <th className="px-3 py-2 font-medium text-center">Qty</th>
                                <th className="px-3 py-2 font-medium text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {data.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2">{item.name}</td>
                                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right">Rs. {(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                              ))}
                              {data.allocatedDiscount > 0 && (
                                <tr className="bg-destructive/5 text-destructive font-bold border-t-2 border-destructive/20">
                                  <td colSpan={2} className="px-3 py-2 text-right uppercase tracking-wider text-[10px]">Less: Allocated Discount</td>
                                  <td className="px-3 py-2 text-right">- Rs. {data.allocatedDiscount.toFixed(2)}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border bg-secondary/30 flex justify-end">
                <div className="text-right">
                  <p className="text-muted-foreground text-sm font-medium">Grand Total</p>
                  <p className="text-2xl font-black text-primary">Rs. {detailsOrder.grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Partition Details Modal */}
      {selectedPartition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-xl">{selectedPartition} - Sales Breakdown</h3>
              <button onClick={() => setSelectedPartition(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {partitionItemDetails.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items sold in this category.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-border rounded-lg overflow-hidden">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Item Name</th>
                        <th className="px-4 py-3 font-medium text-center">Total Qty Sold</th>
                        <th className="px-4 py-3 font-medium text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {partitionItemDetails.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-medium text-primary">Rs. {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                      {partitionItemDetails.allocatedDiscount > 0 && (
                        <tr className="bg-destructive/5 text-destructive font-bold border-t-2 border-destructive/20">
                          <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-xs">Less: Allocated Discounts</td>
                          <td className="px-4 py-3 text-right">- Rs. {partitionItemDetails.allocatedDiscount.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {partitionItemDetails.orderIds.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Orders In This Partition</h4>
                  <div className="flex flex-wrap gap-2">
                    {partitionItemDetails.orderIds.map(id => (
                      <button 
                        key={id} 
                        onClick={() => {
                          const order = orders.find(o => o.orderNumber === id);
                          if (order) setDetailsOrder(order);
                        }}
                        className="bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-xs px-2 py-1 rounded border border-border cursor-pointer"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border bg-secondary/30 flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-medium">Total Net Revenue</span>
              <span className="text-2xl font-black text-primary">
                Rs. {(partitionItemDetails.items.reduce((sum, item) => sum + item.total, 0) - partitionItemDetails.allocatedDiscount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Orders Modal */}
      {showUnpaidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-xl text-destructive flex items-center gap-2">
                Unpaid Balances Breakdown
              </h3>
              <button onClick={() => setShowUnpaidModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {unpaidOrdersList.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No unpaid orders in this period! 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-border rounded-lg overflow-hidden">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Order ID</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium text-center">Grand Total</th>
                        <th className="px-4 py-3 font-medium text-right">Owes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {unpaidOrdersList.map((order, idx) => (
                        <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <button 
                              onClick={() => setDetailsOrder(order)}
                              className="bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-xs px-2 py-1 rounded border border-border cursor-pointer"
                            >
                              {order.orderNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3">{order.customerName}</td>
                          <td className="px-4 py-3 text-center">Rs. {order.grandTotal.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-bold text-destructive">Rs. {order.owes.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border bg-destructive/10 flex justify-between items-center">
              <span className="text-destructive text-sm font-bold uppercase tracking-wider">Total Unpaid</span>
              <span className="text-2xl font-black text-destructive">
                Rs. {totalUnpaid.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
