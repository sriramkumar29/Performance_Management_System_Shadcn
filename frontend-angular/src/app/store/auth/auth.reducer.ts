import { createReducer, on } from '@ngrx/store';
import { User } from '../../core/services/auth.service';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null,
    isAuthenticated: true,
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    isAuthenticated: false,
    user: null,
  })),
  on(AuthActions.logout, (state) => ({
    ...state,
    user: null,
    isAuthenticated: false,
    error: null,
  })),
  on(AuthActions.loadUser, (state) => ({
    ...state,
    loading: true,
  }))
);
