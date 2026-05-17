import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';
import NotificationBanner from './NotificationBanner';

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const { notification, isVisible, hideNotification } = useNotification();

  return (
    <>
      {children}
      <NotificationBanner
        isVisible={isVisible}
        notification={notification}
        onClose={hideNotification}
        onClick={(chatId) => { hideNotification(); nav(`/chat/${chatId}`); }}
      />
    </>
  );
}
