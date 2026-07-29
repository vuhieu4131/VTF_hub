import { useVirtualKeyboardVisible } from "hooks";
import React, { FC, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { MenuItem } from "types/menu";
import { BottomNavigation, Icon } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { currentUserState } from "../state";

const tabs: Record<string, MenuItem> = {
  "/": {
    label: "Lịch làm việc",
    icon: <Icon icon="zi-calendar" />,
  },
  "/events": {
    label: "Sự kiện",
    icon: <Icon icon="zi-star" />,
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

  const noBottomNav = useMemo(() => {
    return NO_BOTTOM_NAVIGATION_PAGES.includes(location.pathname);
  }, [location]);

  if (noBottomNav || keyboardVisible) {
    return <></>;
  }

  const currentUser = useRecoilValue(currentUserState);

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
      {filteredTabs.map((path: string) => (
        <BottomNavigation.Item
          key={path}
          label={tabs[path].label}
          icon={tabs[path].icon}
        />
      ))}
    </BottomNavigation>
  );
};
