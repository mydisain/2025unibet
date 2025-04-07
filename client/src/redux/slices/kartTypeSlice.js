import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosConfig';

// Get all kart types
export const getKartTypes = createAsyncThunk(
  'kartTypes/getKartTypes',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get('/api/kart-types');
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

// Get all kart types for admin
export const getKartTypesAdmin = createAsyncThunk(
  'kartTypes/getKartTypesAdmin',
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

      const { data } = await axiosInstance.get('/api/kart-types/admin/all', config);
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

// Create kart type
export const createKartType = createAsyncThunk(
  'kartTypes/createKartType',
  async (kartTypeData, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axiosInstance.post('/api/kart-types', kartTypeData, config);
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

// Update kart type
export const updateKartType = createAsyncThunk(
  'kartTypes/updateKartType',
  async ({ id, ...kartTypeData }, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axiosInstance.put(`/api/kart-types/${id}`, kartTypeData, config);
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

// Delete kart type
export const deleteKartType = createAsyncThunk(
  'kartTypes/deleteKartType',
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

      await axiosInstance.delete(`/api/kart-types/${id}`, config);
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
  kartTypes: [],
  loading: false,
  error: null,
  success: false,
};

const kartTypeSlice = createSlice({
  name: 'kartTypes',
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
      .addCase(getKartTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getKartTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.kartTypes = action.payload;
      })
      .addCase(getKartTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getKartTypesAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getKartTypesAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.kartTypes = action.payload;
      })
      .addCase(getKartTypesAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createKartType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createKartType.fulfilled, (state, action) => {
        state.loading = false;
        state.kartTypes = [...state.kartTypes, action.payload];
        state.success = true;
      })
      .addCase(createKartType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateKartType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateKartType.fulfilled, (state, action) => {
        state.loading = false;
        state.kartTypes = state.kartTypes.map((kartType) =>
          kartType._id === action.payload._id ? action.payload : kartType
        );
        state.success = true;
      })
      .addCase(updateKartType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteKartType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteKartType.fulfilled, (state, action) => {
        state.loading = false;
        state.kartTypes = state.kartTypes.filter(
          (kartType) => kartType._id !== action.payload
        );
        state.success = true;
      })
      .addCase(deleteKartType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetSuccess } = kartTypeSlice.actions;

export default kartTypeSlice.reducer;
