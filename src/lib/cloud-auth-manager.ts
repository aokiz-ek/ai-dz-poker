/**
 * 云端认证管理器 - 统一管理Firebase和Supabase认证
 * 
 * 功能特性：
 * 1. 多云端服务认证支持
 * 2. 用户状态管理
 * 3. 自动令牌刷新
 * 4. 离线状态检测
 * 5. 认证状态持久化
 * 6. 安全令牌存储
 */

import { CloudProviderConfig } from './storage/cloud-adapter';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
  isAnonymous?: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: 'bearer' | 'jwt';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: AuthToken | null;
  provider: 'firebase' | 'supabase' | null;
  isLoading: boolean;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthEventCallbacks {
  onAuthStateChange: (state: AuthState) => void;
  onTokenRefresh: (token: AuthToken) => void;
  onError: (error: string) => void;
  onSignOut: () => void;
}

export class CloudAuthManager {
  private config: CloudProviderConfig;
  private authState: AuthState;
  private firebaseAuth: any = null;
  private supabaseClient: any = null;
  private refreshTimer?: NodeJS.Timeout;
  private callbacks: Partial<AuthEventCallbacks> = {};

  constructor(config: CloudProviderConfig) {
    this.config = config;
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
      provider: null,
      isLoading: false,
      error: null
    };
  }

  /**
   * 初始化认证管理器
   */
  async initialize(): Promise<void> {
    try {
      this.authState.isLoading = true;
      this.notifyStateChange();

      switch (this.config.provider) {
        case 'firebase':
          await this.initializeFirebaseAuth();
          break;
        case 'supabase':
          await this.initializeSupabaseAuth();
          break;
        default:
          throw new Error(`Unsupported auth provider: ${this.config.provider}`);
      }

      // 恢复持久化的认证状态
      await this.restoreAuthState();

      // 设置自动令牌刷新
      this.setupTokenRefresh();

      this.authState.isLoading = false;
      this.notifyStateChange();

      console.log(`${this.config.provider} auth initialized successfully`);
    } catch (error) {
      this.authState.isLoading = false;
      this.authState.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * 初始化 Firebase 认证
   */
  private async initializeFirebaseAuth(): Promise<void> {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, connectAuthEmulator, onAuthStateChanged } = await import('firebase/auth');

    // Firebase 配置
    const firebaseConfig = {
      apiKey: this.config.apiKey,
      authDomain: `${this.config.projectId}.firebaseapp.com`,
      projectId: this.config.projectId,
      storageBucket: `${this.config.projectId}.appspot.com`,
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:abcdef123456"
    };

    const app = initializeApp(firebaseConfig, 'auth-app');
    this.firebaseAuth = getAuth(app);

    // 开发环境连接模拟器
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      try {
        connectAuthEmulator(this.firebaseAuth, 'http://localhost:9099');
      } catch (error) {
        console.warn('Firebase Auth emulator connection error:', error);
      }
    }

    // 监听认证状态变化
    onAuthStateChanged(this.firebaseAuth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        const tokenResult = await user.getIdTokenResult();
        
        this.authState.isAuthenticated = true;
        this.authState.user = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: 'firebase',
          createdAt: user.metadata.creationTime || new Date().toISOString(),
          lastLoginAt: user.metadata.lastSignInTime || new Date().toISOString(),
          isAnonymous: user.isAnonymous
        };
        this.authState.token = {
          accessToken: token,
          refreshToken: user.refreshToken,
          expiresAt: tokenResult.expirationTime ? Date.parse(tokenResult.expirationTime) : Date.now() + 3600000,
          tokenType: 'jwt'
        };
        this.authState.provider = 'firebase';
        this.authState.error = null;
      } else {
        this.clearAuthState();
      }

      await this.persistAuthState();
      this.notifyStateChange();
    });
  }

  /**
   * 初始化 Supabase 认证
   */
  private async initializeSupabaseAuth(): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');

    this.supabaseClient = createClient(
      this.config.baseUrl || `https://${this.config.projectId}.supabase.co`,
      this.config.apiKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      }
    );

    // 监听认证状态变化
    this.supabaseClient.auth.onAuthStateChange(async (event: string, session: any) => {
      if (session?.user) {
        this.authState.isAuthenticated = true;
        this.authState.user = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.full_name,
          photoURL: session.user.user_metadata?.avatar_url,
          provider: 'supabase',
          createdAt: session.user.created_at,
          lastLoginAt: session.user.last_sign_in_at || new Date().toISOString()
        };
        this.authState.token = {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at * 1000,
          tokenType: 'bearer'
        };
        this.authState.provider = 'supabase';
        this.authState.error = null;
      } else {
        this.clearAuthState();
      }

      await this.persistAuthState();
      this.notifyStateChange();
    });
  }

  /**
   * 用户注册
   */
  async signUp(data: SignUpData): Promise<UserProfile> {
    try {
      this.authState.isLoading = true;
      this.authState.error = null;
      this.notifyStateChange();

      let user: UserProfile;

      switch (this.config.provider) {
        case 'firebase':
          user = await this.firebaseSignUp(data);
          break;
        case 'supabase':
          user = await this.supabaseSignUp(data);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      this.authState.isLoading = false;
      this.notifyStateChange();
      
      return user;
    } catch (error) {
      this.authState.isLoading = false;
      this.authState.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Firebase 用户注册
   */
  private async firebaseSignUp(data: SignUpData): Promise<UserProfile> {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    
    const userCredential = await createUserWithEmailAndPassword(
      this.firebaseAuth,
      data.email,
      data.password
    );

    if (data.displayName) {
      await updateProfile(userCredential.user, {
        displayName: data.displayName
      });
    }

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: data.displayName || null,
      photoURL: null,
      provider: 'firebase',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }

  /**
   * Supabase 用户注册
   */
  private async supabaseSignUp(data: SignUpData): Promise<UserProfile> {
    const { data: result, error } = await this.supabaseClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.displayName
        }
      }
    });

    if (error) throw error;
    if (!result.user) throw new Error('Registration failed');

    return {
      uid: result.user.id,
      email: result.user.email,
      displayName: data.displayName || null,
      photoURL: null,
      provider: 'supabase',
      createdAt: result.user.created_at,
      lastLoginAt: new Date().toISOString()
    };
  }

  /**
   * 用户登录
   */
  async signIn(data: SignInData): Promise<UserProfile> {
    try {
      this.authState.isLoading = true;
      this.authState.error = null;
      this.notifyStateChange();

      let user: UserProfile;

      switch (this.config.provider) {
        case 'firebase':
          user = await this.firebaseSignIn(data);
          break;
        case 'supabase':
          user = await this.supabaseSignIn(data);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      this.authState.isLoading = false;
      this.notifyStateChange();
      
      return user;
    } catch (error) {
      this.authState.isLoading = false;
      this.authState.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Firebase 用户登录
   */
  private async firebaseSignIn(data: SignInData): Promise<UserProfile> {
    const { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } = await import('firebase/auth');
    
    // 设置持久化策略
    const persistence = data.rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(this.firebaseAuth, persistence);

    const userCredential = await signInWithEmailAndPassword(
      this.firebaseAuth,
      data.email,
      data.password
    );

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
      provider: 'firebase',
      createdAt: userCredential.user.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }

  /**
   * Supabase 用户登录
   */
  private async supabaseSignIn(data: SignInData): Promise<UserProfile> {
    const { data: result, error } = await this.supabaseClient.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (error) throw error;
    if (!result.user) throw new Error('Login failed');

    return {
      uid: result.user.id,
      email: result.user.email,
      displayName: result.user.user_metadata?.display_name || result.user.user_metadata?.full_name,
      photoURL: result.user.user_metadata?.avatar_url,
      provider: 'supabase',
      createdAt: result.user.created_at,
      lastLoginAt: new Date().toISOString()
    };
  }

  /**
   * 匿名登录
   */
  async signInAnonymously(): Promise<UserProfile> {
    if (this.config.provider !== 'firebase') {
      throw new Error('Anonymous auth only supported in Firebase');
    }

    try {
      this.authState.isLoading = true;
      this.notifyStateChange();

      const { signInAnonymously } = await import('firebase/auth');
      const userCredential = await signInAnonymously(this.firebaseAuth);

      const user: UserProfile = {
        uid: userCredential.user.uid,
        email: null,
        displayName: '匿名用户',
        photoURL: null,
        provider: 'firebase',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isAnonymous: true
      };

      this.authState.isLoading = false;
      this.notifyStateChange();
      
      return user;
    } catch (error) {
      this.authState.isLoading = false;
      this.authState.error = error instanceof Error ? error.message : String(error);
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async signOut(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'firebase':
          const { signOut } = await import('firebase/auth');
          await signOut(this.firebaseAuth);
          break;
        case 'supabase':
          await this.supabaseClient.auth.signOut();
          break;
      }

      this.clearAuthState();
      await this.clearPersistedState();
      this.callbacks.onSignOut?.();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(): Promise<AuthToken> {
    if (!this.authState.isAuthenticated || !this.authState.token) {
      throw new Error('No authenticated user to refresh token for');
    }

    try {
      switch (this.config.provider) {
        case 'firebase':
          if (!this.firebaseAuth.currentUser) throw new Error('No current user');
          
          const token = await this.firebaseAuth.currentUser.getIdToken(true);
          const tokenResult = await this.firebaseAuth.currentUser.getIdTokenResult();
          
          this.authState.token = {
            accessToken: token,
            refreshToken: this.firebaseAuth.currentUser.refreshToken,
            expiresAt: tokenResult.expirationTime ? Date.parse(tokenResult.expirationTime) : Date.now() + 3600000,
            tokenType: 'jwt'
          };
          break;

        case 'supabase':
          const { data, error } = await this.supabaseClient.auth.refreshSession();
          if (error) throw error;
          
          this.authState.token = {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at * 1000,
            tokenType: 'bearer'
          };
          break;
      }

      await this.persistAuthState();
      this.callbacks.onTokenRefresh?.(this.authState.token);
      return this.authState.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * 获取当前访问令牌
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.authState.token) return null;

    // 检查令牌是否即将过期（提前5分钟刷新）
    if (this.authState.token.expiresAt - Date.now() < 5 * 60 * 1000) {
      try {
        await this.refreshToken();
      } catch (error) {
        console.warn('Token refresh failed:', error);
      }
    }

    return this.authState.token.accessToken;
  }

  /**
   * 设置自动令牌刷新
   */
  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      if (this.authState.isAuthenticated && this.authState.token) {
        // 在令牌过期前10分钟刷新
        const timeToExpire = this.authState.token.expiresAt - Date.now();
        if (timeToExpire < 10 * 60 * 1000) {
          try {
            await this.refreshToken();
          } catch (error) {
            console.error('Auto token refresh failed:', error);
          }
        }
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次
  }

  /**
   * 持久化认证状态
   */
  private async persistAuthState(): Promise<void> {
    try {
      const stateToStore = {
        user: this.authState.user,
        token: this.authState.token,
        provider: this.authState.provider,
        isAuthenticated: this.authState.isAuthenticated
      };

      localStorage.setItem('cloud_auth_state', JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Failed to persist auth state:', error);
    }
  }

  /**
   * 恢复持久化的认证状态
   */
  private async restoreAuthState(): Promise<void> {
    try {
      const storedState = localStorage.getItem('cloud_auth_state');
      if (!storedState) return;

      const state = JSON.parse(storedState);
      
      // 验证令牌是否仍然有效
      if (state.token && state.token.expiresAt > Date.now()) {
        this.authState.user = state.user;
        this.authState.token = state.token;
        this.authState.provider = state.provider;
        this.authState.isAuthenticated = state.isAuthenticated;
      } else {
        // 令牌已过期，清除状态
        await this.clearPersistedState();
      }
    } catch (error) {
      console.warn('Failed to restore auth state:', error);
      await this.clearPersistedState();
    }
  }

  /**
   * 清除持久化状态
   */
  private async clearPersistedState(): Promise<void> {
    try {
      localStorage.removeItem('cloud_auth_state');
    } catch (error) {
      console.warn('Failed to clear persisted state:', error);
    }
  }

  /**
   * 清除认证状态
   */
  private clearAuthState(): void {
    this.authState.isAuthenticated = false;
    this.authState.user = null;
    this.authState.token = null;
    this.authState.provider = null;
    this.authState.error = null;
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    this.callbacks.onAuthStateChange?.(this.authState);
  }

  /**
   * 设置事件回调
   */
  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.callbacks.onAuthStateChange = callback;
    return () => {
      delete this.callbacks.onAuthStateChange;
    };
  }

  onTokenRefresh(callback: (token: AuthToken) => void): () => void {
    this.callbacks.onTokenRefresh = callback;
    return () => {
      delete this.callbacks.onTokenRefresh;
    };
  }

  onError(callback: (error: string) => void): () => void {
    this.callbacks.onError = callback;
    return () => {
      delete this.callbacks.onError;
    };
  }

  onSignOut(callback: () => void): () => void {
    this.callbacks.onSignOut = callback;
    return () => {
      delete this.callbacks.onSignOut;
    };
  }

  /**
   * 获取当前认证状态
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): UserProfile | null {
    return this.authState.user;
  }

  /**
   * 销毁认证管理器
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.callbacks = {};
  }
}