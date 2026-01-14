
import { 
    getPermissions, 
    hasRole, 
    can, 
    assertCan, 
    assignRoleWithAudit, 
    UserContext, 
    RoleName 
} from '../rbac';
import { supabaseAdmin } from '../supabase/server';
import { logger } from '@lib/logger';

// Mock Supabase
jest.mock('../supabase/server', () => {
    const mockAdmin = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({})
    };
    return {
        supabaseAdmin: mockAdmin
    };
});

// Mock logger
jest.mock('@lib/logger', () => {
    const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    };
    return {
        logger: mockLogger,
        Logger: jest.fn(() => mockLogger)
    };
}, { virtual: true });

// Mock flags
jest.mock('../flags', () => ({
    flags: {
        enableAdvancedAnalytics: false
    }
}));

describe('RBAC System', () => {
    const adminUser: UserContext = { id: 'admin-1', roles: ['admin'] };
    const editorUser: UserContext = { id: 'editor-1', roles: ['editor'] };
    const viewerUser: UserContext = { id: 'viewer-1', roles: ['viewer'] };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPermissions', () => {
        it('should return all permissions for admin', () => {
            const permissions = getPermissions(adminUser);
            expect(permissions.has('users.read')).toBe(true);
            expect(permissions.has('videos.render')).toBe(true);
            expect(permissions.has('admin.dashboard')).toBe(true);
        });

        it('should return limited permissions for viewer', () => {
            const permissions = getPermissions(viewerUser);
            expect(permissions.has('users.read')).toBe(true);
            expect(permissions.has('videos.render')).toBe(false);
            expect(permissions.has('admin.dashboard')).toBe(false);
        });
    });

    describe('can / assertCan', () => {
        it('should allow authorized actions', () => {
            expect(can(adminUser, 'videos.render')).toBe(true);
            expect(() => assertCan(adminUser, 'videos.render')).not.toThrow();
        });

        it('should deny unauthorized actions', () => {
            expect(can(viewerUser, 'videos.render')).toBe(false);
            expect(() => assertCan(viewerUser, 'videos.render')).toThrow('Permissão negada: videos.render');
        });

        it('should verify error code on denial', () => {
            try {
                assertCan(viewerUser, 'videos.render');
            } catch (e: any) {
                 expect(e.code).toBe('RBAC_DENIED');
            }
        });
    });

    describe('assignRoleWithAudit', () => {
        it('should assign role and audit event', async () => {
            const result = await assignRoleWithAudit(viewerUser, 'editor', 'admin-1');

            expect(result.roles).toContain('editor');
            expect(supabaseAdmin.from).toHaveBeenCalledWith('analytics_events');
            expect(supabaseAdmin.insert).toHaveBeenCalledWith({
                userId: 'admin-1',
                eventType: 'rbac_role_assigned',
                eventData: { targetUserId: 'viewer-1', role: 'editor', previousRoles: ['viewer'] }
            });
        });

        it('should log error if audit fails but still return updated context', async () => {
             // Simulate Supabase failure
             (supabaseAdmin.insert as jest.Mock).mockRejectedValue(new Error('DB Error'));

             const result = await assignRoleWithAudit(viewerUser, 'admin', 'admin-1');

             expect(result.roles).toContain('admin');
             expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Falha ao auditar'), expect.any(Error), expect.anything());
        });
    });
});
