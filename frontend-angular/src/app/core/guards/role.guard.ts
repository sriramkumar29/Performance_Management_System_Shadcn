import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PermissionsService, Permission, Role } from '../services/permissions.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/auth/login']);
          return false;
        }

        // Check for required permissions in route data
        const requiredPermissions = route.data['permissions'] as Permission[];
        const requiredRole = route.data['role'] as Role;
        const requireAll = route.data['requireAll'] as boolean || false;

        // Check permissions
        if (requiredPermissions && requiredPermissions.length > 0) {
          const hasPermission = requireAll 
            ? this.permissionsService.hasAllPermissions(requiredPermissions)
            : this.permissionsService.hasAnyPermission(requiredPermissions);
          
          if (!hasPermission) {
            this.router.navigate(['/dashboard']);
            return false;
          }
        }

        // Check minimum role requirement
        if (requiredRole && !this.permissionsService.hasMinimumRole(requiredRole)) {
          this.router.navigate(['/dashboard']);
          return false;
        }

        return true;
      })
    );
  }
}
