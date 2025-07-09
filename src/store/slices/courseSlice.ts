import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { CourseService } from '@/lib/courseService';
import { RegisteredCourse, EmployeeCourse } from '@/types/auth';

interface CourseState {
  registeredCourses: RegisteredCourse[];
  assignedCourses: EmployeeCourse[];
  loading: boolean;
  error: string | null;
}

const initialState: CourseState = {
  registeredCourses: [],
  assignedCourses: [],
  loading: false,
  error: null,
};

// Async thunk for loading course data
export const loadCourseData = createAsyncThunk(
  'course/loadCourseData',
  async (employeeId: string, { rejectWithValue }) => {
    try {
      const [registered, assigned] = await Promise.all([
        CourseService.getRegisteredCourses(employeeId),
        CourseService.getTodaysAssignedCourses(employeeId)
      ]);

      return {
        registeredCourses: registered,
        assignedCourses: assigned
      };
    } catch (error) {
      console.error('Error loading course data:', error);
      return rejectWithValue('コースデータの読み込みに失敗しました');
    }
  }
);

// Async thunk for setting a single course (replaces existing)
export const setCourse = createAsyncThunk(
  'course/setCourse',
  async ({ employeeId, courseId, courseName }: { employeeId: string; courseId: string; courseName: string }, { rejectWithValue }) => {
    try {
      const success = await CourseService.setRegisteredCourse(employeeId, courseId, courseName);
      
      if (!success) {
        return rejectWithValue('コースの設定に失敗しました');
      }

      return { courseId, courseName };
    } catch (error) {
      console.error('Error setting course:', error);
      return rejectWithValue('コースの設定中にエラーが発生しました');
    }
  }
);

// Async thunk for toggling course assignment
export const toggleCourseAssignment = createAsyncThunk(
  'course/toggleCourseAssignment',
  async ({ employeeId, courseId, isAssigned }: { employeeId: string; courseId: string; isAssigned: boolean }, { rejectWithValue }) => {
    try {
      let success;
      if (isAssigned) {
        success = await CourseService.unassignCourseToday(employeeId, courseId);
      } else {
        success = await CourseService.assignCourseToday(employeeId, courseId);
      }

      if (!success) {
        return rejectWithValue('担当設定の変更に失敗しました');
      }

      return { courseId, isAssigned: !isAssigned };
    } catch (error) {
      console.error('Error toggling course assignment:', error);
      return rejectWithValue('担当設定の変更中にエラーが発生しました');
    }
  }
);

// Async thunk for adding a new registered course
export const addRegisteredCourse = createAsyncThunk(
  'course/addRegisteredCourse',
  async ({ employeeId, courseId, courseName }: { employeeId: string; courseId: string; courseName: string }, { rejectWithValue }) => {
    try {
      const success = await CourseService.setRegisteredCourse(employeeId, courseId, courseName);
      
      if (!success) {
        return rejectWithValue('コースの追加に失敗しました');
      }

      return { courseId, courseName };
    } catch (error) {
      console.error('Error adding registered course:', error);
      return rejectWithValue('コースの追加中にエラーが発生しました');
    }
  }
);

// Async thunk for removing a registered course
export const removeRegisteredCourse = createAsyncThunk(
  'course/removeRegisteredCourse',
  async ({ employeeId, courseId }: { employeeId: string; courseId: string }, { rejectWithValue }) => {
    try {
      const success = await CourseService.removeRegisteredCourse(employeeId, courseId);
      
      if (!success) {
        return rejectWithValue('コースの削除に失敗しました');
      }

      return { courseId };
    } catch (error) {
      console.error('Error removing registered course:', error);
      return rejectWithValue('コースの削除中にエラーが発生しました');
    }
  }
);

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCourseData: (state) => {
      state.registeredCourses = [];
      state.assignedCourses = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Load course data cases
      .addCase(loadCourseData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCourseData.fulfilled, (state, action) => {
        state.loading = false;
        state.registeredCourses = action.payload.registeredCourses;
        state.assignedCourses = action.payload.assignedCourses;
        state.error = null;
      })
      .addCase(loadCourseData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Set course cases
      .addCase(setCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(setCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle assignment cases
      .addCase(toggleCourseAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(toggleCourseAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add registered course cases
      .addCase(addRegisteredCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addRegisteredCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Add the new course to the registered courses
        const newCourse: RegisteredCourse = {
          id: '', // Will be set by database
          employee_id: '', // Will be set by database
          course_id: action.payload.courseId,
          course_name: action.payload.courseName,
          created_at: new Date().toISOString()
        };
        state.registeredCourses.push(newCourse);
      })
      .addCase(addRegisteredCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Remove registered course cases
      .addCase(removeRegisteredCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeRegisteredCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Remove the course from registered courses
        state.registeredCourses = state.registeredCourses.filter(
          course => course.course_id !== action.payload.courseId
        );
      })
      .addCase(removeRegisteredCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCourseData } = courseSlice.actions;
export default courseSlice.reducer;