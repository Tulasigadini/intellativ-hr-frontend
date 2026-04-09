import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tasksAPI, onboardingAPI } from '../services/api';

const NotificationContext = createContext(null);

/**
 * Central notification store — fetched once on login, refreshed on demand.
 * No polling. Call refresh() after any action that creates tasks/notifications.
 */
export function NotificationProvider({ children, user }) {
  const [taskCount, setTaskCount]                      = useState(0);
  const [notifCount, setNotifCount]                    = useState(0);
  const [pendingOnboardingCount, setPendingOnboarding] = useState(0);
  const [loaded, setLoaded]                            = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [ts, ns] = await Promise.all([
        tasksAPI.stats(),
        onboardingAPI.getNotificationCount(),
      ]);

      // Use my_tasks (directly assigned to me, active only) for sidebar badge
      const myActive = ts.data.my_tasks ?? ((ts.data.pending || 0) + (ts.data.in_progress || 0));
      setTaskCount(myActive);
      setNotifCount(ns.data.unread || 0);

      // Only fetch pending onboarding count for users who can onboard employees
      // (avoids a 403 error for regular employees who have no permission)
      const canOnboard = user?.permissions?.can_onboard_employees === true;
      if (canOnboard) {
        try {
          const po = await onboardingAPI.getPendingEmployees();
          setPendingOnboarding(po.data?.length ?? 0);
        } catch {
          setPendingOnboarding(0);
        }
      } else {
        setPendingOnboarding(0);
      }
    } catch { /* silent */ }
    finally { setLoaded(true); }
  }, [user]);

  // Fetch once when user logs in, clear on logout
  useEffect(() => {
    if (user) refresh();
    else {
      setTaskCount(0);
      setNotifCount(0);
      setPendingOnboarding(0);
      setLoaded(false);
    }
  }, [user, refresh]);

  return (
    <NotificationContext.Provider value={{ taskCount, notifCount, pendingOnboardingCount, refresh, loaded }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
