import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ChatService } from '@/lib/chatService';
import { Customer, Employee } from '@/types/auth';

interface CustomerState {
  customers: Customer[];
  employees: Employee[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  customers: [],
  employees: [],
  loading: false,
  error: null,
};

// Async thunk for loading customers for employee
export const loadCustomersForEmployee = createAsyncThunk(
  'customer/loadCustomersForEmployee',
  async (employeeId: string, { rejectWithValue }) => {
    try {
      const customers = await ChatService.getCustomersForEmployee(employeeId);
      return customers;
    } catch (error) {
      console.error('Error loading customers:', error);
      return rejectWithValue('顧客データの読み込みに失敗しました');
    }
  }
);

// Async thunk for loading employees for customer
export const loadEmployeesForCustomer = createAsyncThunk(
  'customer/loadEmployeesForCustomer',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const employees = await ChatService.getEmployeesForCustomer(customerId);
      return employees;
    } catch (error) {
      console.error('Error loading employees:', error);
      return rejectWithValue('社員データの読み込みに失敗しました');
    }
  }
);

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCustomers: (state) => {
      state.customers = [];
    },
    clearEmployees: (state) => {
      state.employees = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomersForEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCustomersForEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload;
        state.error = null;
      })
      .addCase(loadCustomersForEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadEmployeesForCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadEmployeesForCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
        state.error = null;
      })
      .addCase(loadEmployeesForCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCustomers, clearEmployees } = customerSlice.actions;
export default customerSlice.reducer;