import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosConfig';

// Get all karts
export const getKarts = createAsyncThunk(
  'karts/getKarts',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get('/api/karts');
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Get all karts for admin
export const getKartsAdmin = createAsyncThunk(
  'karts/getKartsAdmin',
  async (_, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axiosInstance.get('/api/karts/admin/all', config);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Create kart
export const createKart = createAsyncThunk(
  'karts/createKart',
  async (kartData, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      // Check if user is authenticated and is an admin
      if (!userInfo || !userInfo.token) {
        console.error('Authentication error: No user token found');
        return rejectWithValue('Authentication error: No user token found');
      }

      if (!userInfo.isAdmin) {
        console.error('Authorization error: User is not an admin');
        return rejectWithValue('Authorization error: User is not an admin');
      }

      // Ensure token is properly formatted
      const token = userInfo.token.trim();
      
      console.log('Creating kart with token:', token.substring(0, 10) + '...');
      console.log('User info:', { 
        id: userInfo._id, 
        isAdmin: userInfo.isAdmin,
        tokenExists: !!token,
        tokenLength: token.length 
      });

      // Force refresh user from localStorage to ensure we have the latest token
      try {
        const refreshedUserInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (refreshedUserInfo && refreshedUserInfo.token) {
          console.log('Using refreshed token from localStorage');
          userInfo = refreshedUserInfo;
        }
      } catch (e) {
        console.error('Error refreshing user info from localStorage:', e);
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      const { data } = await axiosInstance.post('/api/karts', kartData, config);
      return data;
    } catch (error) {
      console.error('Create kart error:', error.response?.data || error.message);
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Update kart
export const updateKart = createAsyncThunk(
  'karts/updateKart',
  async ({ id, kartData }, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      if (!userInfo || !userInfo.token) {
        console.error('Authentication error: No user token found');
        return rejectWithValue('Authentication error: No user token found');
      }

      // Ensure token is properly formatted
      const token = userInfo.token.trim();
      
      console.log('Updating kart with token:', token.substring(0, 10) + '...');
      console.log('User info:', { 
        id: userInfo._id, 
        isAdmin: userInfo.isAdmin,
        tokenExists: !!token,
        tokenLength: token.length 
      });
      
      // Force refresh user from localStorage to ensure we have the latest token
      try {
        const refreshedUserInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (refreshedUserInfo && refreshedUserInfo.token) {
          console.log('Using refreshed token from localStorage');
          userInfo = refreshedUserInfo;
        }
      } catch (e) {
        console.error('Error refreshing user info from localStorage:', e);
      }
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      console.log(`Making PUT request to /api/karts/${id}`, { kartData, authHeader: config.headers.Authorization.substring(0, 20) + '...' });
      
      const { data } = await axiosInstance.put(`/api/karts/${id}`, kartData, config);
      console.log('Kart updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error updating kart:', error.response?.data || error.message);
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Delete kart
export const deleteKart = createAsyncThunk(
  'karts/deleteKart',
  async (id, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      await axiosInstance.delete(`/api/karts/${id}`, config);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

const initialState = {
  karts: [],
  loading: false,
  error: null,
  success: false,
};

const kartSlice = createSlice({
  name: 'karts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getKarts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getKarts.fulfilled, (state, action) => {
        state.loading = false;
        state.karts = action.payload;
      })
      .addCase(getKarts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getKartsAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getKartsAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.karts = action.payload;
      })
      .addCase(getKartsAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createKart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createKart.fulfilled, (state, action) => {
        state.loading = false;
        state.karts = [...state.karts, action.payload];
        state.success = true;
      })
      .addCase(createKart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateKart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateKart.fulfilled, (state, action) => {
        state.loading = false;
        state.karts = state.karts.map((kart) =>
          kart._id === action.payload._id ? action.payload : kart
        );
        state.success = true;
      })
      .addCase(updateKart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteKart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteKart.fulfilled, (state, action) => {
        state.loading = false;
        state.karts = state.karts.filter((kart) => kart._id !== action.payload);
        state.success = true;
      })
      .addCase(deleteKart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetSuccess } = kartSlice.actions;

export default kartSlice.reducer;
