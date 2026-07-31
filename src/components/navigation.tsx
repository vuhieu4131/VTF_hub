import { useVirtualKeyboardVisible } from "hooks";
import React, { FC, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { MenuItem } from "types/menu";
import { BottomNavigation, Icon } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { currentUserState, allowedScheduleManagersState } from "../state";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Feedback } from "../types/event";
import { checkNextSalaryRaise, checkNextExtraIncomeRaise } from "../utils/date";

const tabs: Record<string, MenuItem> = {
  "/": {
    label: "Lịch làm việc",
    icon: <Icon icon="zi-calendar" />,
  },
  "/diary": {
    label: "Nhật ký",
    icon: <Icon icon="zi-edit-text" />,
  },
  "/documents": {
    label: "Văn bản",
    icon: <Icon icon="zi-file" />,
  },
  "/notifications": {
    label: "Thông báo",
    icon: <Icon icon="zi-notif" />,
  },
  "/profile": {
    label: "Hồ sơ",
    icon: <Icon icon="zi-user" />,
  },
  "/admin-settings": {
    label: "Quản trị",
    icon: <Icon icon="zi-setting" />,
  },
};

export type TabKeys = keyof typeof tabs;

export const NO_BOTTOM_NAVIGATION_PAGES = ["/document-detail"];

export const Navigation: FC = () => {
  const keyboardVisible = useVirtualKeyboardVisible();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  const currentUser = useRecoilValue(currentUserState);
  const allowedScheduleManagers = useRecoilValue(allowedScheduleManagersState);

  useEffect(() => {
    const canEditSchedule = currentUser?.role === 'admin' || allowedScheduleManagers.includes(currentUser?.id || '');
    if (!canEditSchedule) return;

    const unsub = onSnapshot(collection(db, "schedules"), (snapshot) => {
      let count = 0;
      snapshot.forEach(d => {
        if (d.data().status === 'pending') count++;
      });
      setPendingCount(count);
    });
    return () => unsub();
  }, [currentUser, allowedScheduleManagers]);

  const [hasGeneralNotif, setHasGeneralNotif] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    if (location.pathname === '/notifications') {
      localStorage.setItem('lastViewedNotifs', new Date().toISOString());
      setHasGeneralNotif(false);
      return;
    }

    const lastViewed = localStorage.getItem('lastViewedNotifs');
    const lastViewedTime = lastViewed ? new Date(lastViewed).getTime() : 0;
    const todayStr = new Date().toDateString();
    const lastViewedDateStr = lastViewed ? new Date(lastViewed).toDateString() : '';
    const hasViewedToday = todayStr === lastViewedDateStr;

    let hasNewEvents = false;
    let hasActiveProfilesNotifs = false;

    const unsubEvents = onSnapshot(collection(db, "events"), (snapshot) => {
      hasNewEvents = false;
      snapshot.forEach(d => {
        const ev = d.data();
        const createdAt = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
        if (createdAt > lastViewedTime) {
          hasNewEvents = true;
        }
      });
      setHasGeneralNotif(hasNewEvents || (!hasViewedToday && hasActiveProfilesNotifs));
    });

    const unsubProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
      hasActiveProfilesNotifs = false;
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      snapshot.forEach(d => {
        const p = d.data();
        // Check birthday
        if (p.dob) {
           let bMonth = -1;
           if (p.dob.includes('/')) bMonth = parseInt(p.dob.split('/')[1]) - 1;
           else if (p.dob.includes('-')) bMonth = parseInt(p.dob.split('-')[1]) - 1;
           if (bMonth === currentMonth) hasActiveProfilesNotifs = true;
        }
        
        // Check salary
        if (currentUser?.role === 'admin' || currentUser?.profileId === d.id) {
           const salaryCheck = checkNextSalaryRaise(p.nextSalaryRaiseDate, p.professionalTitle, currentMonth, currentYear);
           if (salaryCheck.isMatch) {
             hasActiveProfilesNotifs = true;
           }

           const extraIncomeCheck = checkNextExtraIncomeRaise(p.nextExtraIncomeRaiseDate, p.extraIncomeCode, currentMonth, currentYear);
           if (extraIncomeCheck.isMatch) {
             hasActiveProfilesNotifs = true;
           }
        }
      });
      
      setHasGeneralNotif(hasNewEvents || (!hasViewedToday && hasActiveProfilesNotifs));
    });

    return () => {
      unsubEvents();
      unsubProfiles();
    };
  }, [location.pathname, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubFeedbacks = onSnapshot(collection(db, "feedbacks"), (snapshot) => {
      let count = 0;
      snapshot.forEach(d => {
        const f = d.data() as Feedback;
        const isRecipient = f.recipientId === currentUser.id || (currentUser.role === 'admin' && !f.recipientId);
        if (isRecipient && f.status === 'new') {
          count++;
        }
      });
      setUnreadFeedbackCount(count);
    });
    return () => unsubFeedbacks();
  }, [currentUser]);

  const noBottomNav = useMemo(() => {
    return NO_BOTTOM_NAVIGATION_PAGES.includes(location.pathname);
  }, [location]);

  if (noBottomNav || keyboardVisible) {
    return <></>;
  }

  const filteredTabs = Object.keys(tabs).filter(path => {
    if (path === '/admin-settings' && currentUser?.role !== 'admin') return false;
    if (path === '/documents' && currentUser?.role !== 'admin') return false;
    return true;
  });

  return (
    <BottomNavigation
      id="footer"
      activeKey={location.pathname}
      onChange={navigate}
      className="z-50 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t-0"
    >
      {filteredTabs.map((path: string) => {
        const isNotifTab = path === '/notifications';
        const isProfileTab = path === '/profile';
        
        let hasBadge = false;
        if (isNotifTab && (pendingCount > 0 || unreadFeedbackCount > 0 || hasGeneralNotif)) hasBadge = true;
        if (isProfileTab && unreadFeedbackCount > 0) hasBadge = true;

        return (
          <BottomNavigation.Item
            key={path}
            label={tabs[path].label}
            icon={
              hasBadge ? (
                <div className="relative inline-block">
                  {tabs[path].icon}
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
                </div>
              ) : (
                tabs[path].icon
              )
            }
          />
        );
      })}
    </BottomNavigation>
  );
};
