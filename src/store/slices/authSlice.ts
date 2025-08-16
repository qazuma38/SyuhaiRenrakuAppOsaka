import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  sessionExpiry: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  sessionExpiry: null,
};

const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ userId, password }: { userId: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Redux: Attempting login with:', { userId, password });

      // Validate ID format
      if (!/^\d{4}$/.test(userId) && !/^\d{7}$/.test(userId)) {
        return rejectWithValue('IDは4桁（顧客）または7桁（社員）で入力してください');
      }

      // Check if user exists and password matches
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, phone, password, user_type, fcm_token, base, created_at, is_admin')
        .eq('id', userId)
        .eq('password', password)
        .maybeSingle();

      if (error) {
        console.error('Redux: Login error:', error);
        return rejectWithValue('ログイン処理中にエラーが発生しました');
      }

      if (!user) {
        return rejectWithValue('ユーザーIDまたはパスワードが正しくありません');
      }

      // Create session
      const sessionExpiry = new Date(Date.now() + SESSION_DURATION);
      
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          expire_time: sessionExpiry.toISOString(),
          is_active: true
        });

      if (sessionError) {
        console.warn('Redux: Session creation failed:', sessionError);
      }

      // Prepare user data with proper typing
      const userData: User = {
        id: user.id,
        name: user.name || '',
        phone: user.phone || '',
        password: user.password || '',
        user_type: user.user_type,
        fcm_token: user.fcm_token || '',
        base: user.base || '',
        created_at: user.created_at,
        is_admin: user.is_admin || false
      };

      console.log('Redux: Login successful, user data:', userData);

      return {
        user: userData,
        sessionExpiry: sessionExpiry.toISOString()
      };
    } catch (error) {
      console.error('Redux: Login catch error:', error);
      return rejectWithValue('ログイン処理中にエラーが発生しました');
    }
  }
);

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    
    try {
      if (state.auth.user) {
        console.log('Redux: Logging out user:', state.auth.user.id);
        console.log('Redux: User type:', state.auth.user.user_type);
        
        // Delete employee courses if user is an employee
        if (state.auth.user.user_type === 'employee') {
          console.log('Redux: Deleting employee courses for:', state.auth.user.id);
          const { error: coursesError } = await supabase
            .from('employee_courses')
            .delete()
            .eq('employee_id', state.auth.user.id);

          if (coursesError) {
            console.error('Redux: Failed to delete employee courses on logout:', coursesError);
            return rejectWithValue(`社員コースの削除に失敗しました: ${coursesError.message}`);
          } else {
            console.log('Redux: Successfully deleted employee courses');
          }
        }

        // Deactivate current sessions
        console.log('Redux: Deactivating sessions for user:', state.auth.user.id);
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', state.auth.user.id)
          .eq('is_active', true);

        if (sessionError) {
          console.error('Redux: Failed to deactivate sessions:', sessionError);
          return rejectWithValue(`セッションの無効化に失敗しました: ${sessionError.message}`);
        } else {
          console.log('Redux: Successfully deactivated sessions');
        }
      } else {
        console.log('Redux: No user to logout');
      }
      
      console.log('Redux: Logout completed successfully');
      return null;
    } catch (error) {
      console.error('Redux: Logout catch error:', error);
      return rejectWithValue(`ログアウト処理中にエラーが発生しました: ${error}`);
    }
  }
);

// Async thunk for extending session
export const extendSession = createAsyncThunk(
  'auth/extendSession',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    
    if (state.auth.user) {
      const newExpiry = new Date(Date.now() + SESSION_DURATION);
      
      // Update session in database
      await supabase
        .from('user_sessions')
        .update({ expire_time: newExpiry.toISOString() })
        .eq('user_id', state.auth.user.id)
        .eq('is_active', true);

      return newExpiry.toISOString();
    }
    
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    checkSessionExpiry: (state) => {
      if (state.sessionExpiry && state.user) {
        const now = Date.now();
        const expiry = new Date(state.sessionExpiry).getTime();
        
        if (now >= expiry) {
          state.user = null;
          state.sessionExpiry = null;
          state.error = 'セッションが期限切れです。再度ログインしてください。';
        }
      }
    },
    startLogin: (state) => {
      state.loading = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.sessionExpiry = action.payload.sessionExpiry;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.sessionExpiry = null;
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        console.log('Redux: Logout pending');
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        console.log('Redux: Logout fulfilled');
        state.user = null;
        state.sessionExpiry = null;
        state.error = null;
        state.loading = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        console.log('Redux: Logout rejected:', action.error);
        state.loading = false;
        state.error = 'ログアウトに失敗しました';
      })
      // Extend session cases
      .addCase(extendSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.sessionExpiry = action.payload;
        }
      });
  },
});

export const { clearError, checkSessionExpiry } = authSlice.actions;
export default authSlice.reducer;