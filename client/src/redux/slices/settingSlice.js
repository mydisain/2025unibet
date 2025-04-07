import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosConfig';

// Get settings - using public endpoint
export const getSettings = createAsyncThunk(
  'settings/getSettings',
  async (_, { rejectWithValue }) => {
    try {
      // Using the public endpoint that doesn't require authentication
      const { data } = await axiosInstance.get('/api/settings/public');
      console.log('Settings fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Update settings
export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settingsData, { getState, rejectWithValue }) => {
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

      const { data } = await axiosInstance.put('/api/settings', settingsData, config);
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

// Add holiday
export const addHoliday = createAsyncThunk(
  'settings/addHoliday',
  async (holidayData, { getState, rejectWithValue }) => {
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

      const { data } = await axiosInstance.post('/api/settings/holidays', holidayData, config);
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

// Remove holiday
export const removeHoliday = createAsyncThunk(
  'settings/removeHoliday',
  async (date, { getState, rejectWithValue }) => {
    try {
      const {
        auth: { userInfo },
      } = getState();

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
        data: { date },
      };

      const { data } = await axiosInstance.delete('/api/settings/holidays', config);
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

// Update email template
export const updateEmailTemplate = createAsyncThunk(
  'settings/updateEmailTemplate',
  async ({ type, templateData }, { getState, rejectWithValue }) => {
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

      const { data } = await axiosInstance.put(
        `/api/settings/email-templates/${type}`,
        templateData,
        config
      );
      return { type, template: data };
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Test email configuration
export const testEmailConfiguration = createAsyncThunk(
  'settings/testEmailConfiguration',
  async (email, { getState, rejectWithValue }) => {
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

      const { data } = await axiosInstance.post(
        '/api/settings/test-email',
        { email },
        config
      );
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

const initialState = {
  settings: null,
  loading: false,
  error: null,
  success: false,
  emailTestSuccess: false,
  emailTestError: null,
};

const settingSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.emailTestError = null;
    },
    resetSuccess: (state) => {
      state.success = false;
      state.emailTestSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(getSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
        state.success = true;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addHoliday.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addHoliday.fulfilled, (state, action) => {
        state.loading = false;
        if (state.settings) {
          state.settings.holidays = action.payload;
        }
        state.success = true;
      })
      .addCase(addHoliday.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(removeHoliday.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeHoliday.fulfilled, (state, action) => {
        state.loading = false;
        if (state.settings) {
          state.settings.holidays = action.payload;
        }
        state.success = true;
      })
      .addCase(removeHoliday.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateEmailTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmailTemplate.fulfilled, (state, action) => {
        state.loading = false;
        if (state.settings) {
          const { type, template } = action.payload;
          const templateIndex = state.settings.emailTemplates.findIndex(
            (t) => t.type === type
          );
          if (templateIndex !== -1) {
            state.settings.emailTemplates[templateIndex] = template;
          }
        }
        state.success = true;
      })
      .addCase(updateEmailTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(testEmailConfiguration.pending, (state) => {
        state.loading = true;
        state.emailTestError = null;
      })
      .addCase(testEmailConfiguration.fulfilled, (state) => {
        state.loading = false;
        state.emailTestSuccess = true;
      })
      .addCase(testEmailConfiguration.rejected, (state, action) => {
        state.loading = false;
        state.emailTestError = action.payload;
      });
  },
});

export const { clearError, resetSuccess } = settingSlice.actions;

export default settingSlice.reducer;
