import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  specialInstructions?: string;
}

interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  type: 'Walk-in' | 'Registered';
}

interface CartState {
  items: CartItem[];
  customer: CustomerInfo | null;
  taxRate: number; // e.g., 0.05 for 5%
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

const initialState: CartState = {
  items: [],
  customer: { name: 'Walk-in Customer', phone: '', type: 'Walk-in' },
  taxRate: 0,
  discountAmount: 0,
  subtotal: 0,
  taxAmount: 0,
  total: 0,
};

const calculateTotals = (state: CartState) => {
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = 0; // Tax removed
  const total = subtotal - state.discountAmount;

  state.subtotal = Math.max(0, subtotal);
  state.taxAmount = 0;
  state.total = Math.max(0, total);
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<Omit<CartItem, 'quantity'>>) => {
      const existingItem = state.items.find((item) => item.id === action.payload.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      calculateTotals(state);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      calculateTotals(state);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((item) => item.id === action.payload.id);
      if (item && action.payload.quantity > 0) {
        item.quantity = action.payload.quantity;
      }
      calculateTotals(state);
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discountAmount = action.payload;
      calculateTotals(state);
    },
    setCustomer: (state, action: PayloadAction<CustomerInfo>) => {
      state.customer = action.payload;
    },
    clearCart: (state) => {
      state.items = [];
      state.discountAmount = 0;
      state.customer = { name: 'Walk-in Customer', phone: '', type: 'Walk-in' };
      calculateTotals(state);
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  setDiscount,
  setCustomer,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
