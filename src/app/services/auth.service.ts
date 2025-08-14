import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';

const TOKEN_KEY = 'AUTH_TOKEN';

interface BaseResponse<T> {
  status: number;
  message: string;
  data: T;
}

interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  token$ = this.tokenSubject.asObservable();

  private loggedIn$ = new BehaviorSubject<boolean>(!this.isTokenExpired());

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest): Observable<BaseResponse<LoginResponse>> {
    return this.http
      .post<BaseResponse<LoginResponse>>('/api/auth/login', request)
      .pipe(
        tap((res) => {
          const token = res.data?.token;
          if (token) {
            this.setToken(token, true);
            this.tokenSubject.next(token);
          }
        })
      );
  }

  register(request: RegisterRequest): Observable<BaseResponse<string>> {
    return this.http.post<BaseResponse<string>>('/api/auth/register', request);
  }

  logout(): void {
    this.clearToken();
    this.tokenSubject.next(null);
    this.loggedIn$.next(false);
    this.router.navigate(['/login']);
  }

  get isLoggedIn$() {
    return this.loggedIn$.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string, remember: boolean = true): void {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
    this.loggedIn$.next(true);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp;
      if (!expiry) return false;
      return Math.floor(Date.now() / 1000) >= expiry;
    } catch {
      return true;
    }
  }
}
