/**
 * Role-Based Access Control (RBAC) Middlewares
 */

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
        },
      });
    }
    next();
  };
}

export const requireApplicant = requireRole('applicant');
export const requireStaff = requireRole('operator', 'superadmin');
export const requireSuperAdmin = requireRole('superadmin');
