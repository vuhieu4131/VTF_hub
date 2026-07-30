import { useVirtualKeyboardVisible } from "hooks";
import React, { FC, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { MenuItem } from "types/menu";
import { BottomNavigation, Icon } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { currentUserState, allowedScheduleManagersState } from "../state";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

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
        const hasNotifs = isNotifTab && pendingCount > 0;
        
        return (
          <BottomNavigation.Item
            key={path}
            label={tabs[path].label}
            icon={
              hasNotifs ? (
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
