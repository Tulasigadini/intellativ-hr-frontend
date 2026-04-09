import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://intellativ-hr-frontend.onrender.com/api/v1',
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API.defaults.baseURL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return API(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (username, password) => API.post('/auth/login', { username, password }),
  me: () => API.get('/auth/me'),
  changePassword: (old_password, new_password) => API.post('/auth/change-password', { old_password, new_password }),
  adminChangePassword: (employeeId, new_password) => API.post(`/auth/admin/change-password/${employeeId}`, { new_password }),
};

export const dashboardAPI = {
  getStats: () => API.get('/employees/dashboard/stats'),
};

export const departmentsAPI = {
  list: () => API.get('/departments'),
  create: (data) => API.post('/departments', data),
  update: (id, data) => API.put(`/departments/${id}`, data),
  delete: (id) => API.delete(`/departments/${id}`),
};

export const rolesAPI = {
  list: (departmentId) => API.get('/roles', { params: departmentId ? { department_id: departmentId } : {} }),
  tree: () => API.get('/roles/tree'),
  create: (data) => API.post('/roles', data),
  update: (id, data) => API.put(`/roles/${id}`, data),
  delete: (id) => API.delete(`/roles/${id}`),
};

export const employeesAPI = {
  list: (params) => API.get('/employees', { params }),
  get: (id) => API.get(`/employees/${id}`),
  create: (data) => API.post('/employees', data),
  update: (id, data) => API.put(`/employees/${id}`, data),
  activate: (id) => API.post(`/employees/${id}/activate`),
  relieve: (id, relievingDate) => API.post(`/employees/${id}/relieve`, null, { params: { relieving_date: relievingDate } }),
  uploadDocument: (id, documentType, file) => {
    const fd = new FormData();
    fd.append('document_type', documentType);
    fd.append('file', file);
    return API.post(`/employees/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listDocuments: (id) => API.get(`/employees/${id}/documents`),
  downloadDocument: (employeeId, docId) =>
    `${API.defaults.baseURL}/employees/${employeeId}/documents/${docId}/download`,
  uploadProfilePicture: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post(`/employees/${id}/profile-picture`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const iamAPI = {
  listAccounts: () => API.get('/iam/accounts'),
  toggleAccount: (id) => API.put(`/iam/accounts/${id}/toggle`),
  resetPassword: (id, newPassword) => API.put(`/iam/accounts/${id}/reset-password`, { new_password: newPassword }),
  listSystemAccesses: (roleId) => API.get('/iam/system-accesses', { params: roleId ? { role_id: roleId } : {} }),
  createSystemAccess: (data) => API.post('/iam/system-accesses', data),
  deleteSystemAccess: (id) => API.delete(`/iam/system-accesses/${id}`),
  verifyDocument: (docId, isVerified) => API.put(`/iam/documents/${docId}/verify`, { is_verified: isVerified }),
  getAssetTypes: () => API.get('/iam/asset-types'),
  sendJoiningAssets: (employeeId, assets) => API.post(`/iam/asset-requests/joining/${employeeId}`, assets),
  sendRelievingAssets: (employeeId, assets) => API.post(`/iam/asset-requests/relieving/${employeeId}`, assets),
  upcomingRelieving: (days = 7) => API.get(`/iam/upcoming-relieving`, { params: { days } }),
  getMyAssets: () => API.get('/iam/my-assets'),
  getEmployeeAssets: (employeeId) => API.get(`/iam/employee-assets/${employeeId}`),
  recordAsset: (employeeId, assetId, action) => API.post(`/iam/record-asset/${employeeId}`, null, { params: { asset_id: assetId, action } }),
};

export default API;

export const onboardingAPI = {
  checkExisting: (data) => API.post('/onboarding/check-existing', data),
  reactivate: (id, joiningDate) => API.post(`/onboarding/reactivate/${id}`, null, { params: { joining_date: joiningDate } }),
  sendStepEmail: (data) => API.post('/onboarding/step-email', data),
  getWorkHistory: (id) => API.get(`/onboarding/work-history/${id}`),
  addWorkHistory: (id, data) => API.post(`/onboarding/work-history/${id}`, data),
  updateWorkHistory: (whId, data) => API.put(`/onboarding/work-history/${whId}`, data),
  deleteWorkHistory: (whId) => API.delete(`/onboarding/work-history/${whId}`),
  getInsurance: (id) => API.get(`/onboarding/insurance/${id}`),
  saveInsurance: (id, data) => API.post(`/onboarding/insurance/${id}`, data),
  submitInsurance: (id) => API.post(`/onboarding/insurance/${id}/submit`),
  requestEmailSetup: (id) => API.post(`/onboarding/request-email-setup/${id}`),
  getNotifications: (unreadOnly = false) => API.get('/onboarding/notifications', { params: { unread_only: unreadOnly } }),
  getNotificationCount: () => API.get('/onboarding/notifications/count'),
  markRead: (id) => API.put(`/onboarding/notifications/${id}/read`),
  markAllRead: () => API.put('/onboarding/notifications/read-all'),
  // NEW: Auto-task creation
  createOnboardingTasks: (employeeId, { skipped_insurance = false, skipped_docs = false } = {}) =>
    API.post(`/onboarding/create-onboarding-tasks/${employeeId}`, null, {
      params: { skipped_insurance, skipped_docs },
    }),
  createActivationTasks: (employeeId) =>
    API.post(`/onboarding/create-activation-tasks/${employeeId}`),
  getTeamTasks: () => API.get('/onboarding/team-tasks'),
  getPendingEmployees: () => API.get('/onboarding/pending-employees'),
  sendJoiningDetailsEmail: (employeeId) => API.post(`/onboarding/send-joining-details-email/${employeeId}`),
  getMyJoiningStatus: () => API.get('/onboarding/my-joining-status'),
};

export const tasksAPI = {
  list: (params) => API.get('/tasks', { params }),
  stats: () => API.get('/tasks/stats'),
  create: (data) => API.post('/tasks', data),
  update: (id, data) => API.put(`/tasks/${id}`, data),
  delete: (id) => API.delete(`/tasks/${id}`),
  // NEW: Claim / unclaim team tasks
  claim: (id) => API.put(`/tasks/${id}/claim`),
  unclaim: (id) => API.put(`/tasks/${id}/unclaim`),
};