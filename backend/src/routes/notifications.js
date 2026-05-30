const express = require('express');

module.exports = function (db, authMiddleware, uuidv4) {
  const router = express.Router();

  // GET /api/notifications - Get user notifications
  router.get('/', authMiddleware, (req, res) => {
    const notifications = db.notifications
      .filter((n) => n.user_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.json({ notifications, unread_count: unreadCount, count: notifications.length });
  });

  // PUT /api/notifications/:id/read - Mark notification as read
  router.put('/:id/read', authMiddleware, (req, res) => {
    const notification = db.notifications.find(
      (n) => n.id === req.params.id && n.user_id === req.user.id
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    notification.is_read = true;
    res.json({ message: 'Notification marked as read', notification });
  });

  // PUT /api/notifications/read-all - Mark all as read
  router.put('/read-all', authMiddleware, (req, res) => {
    db.notifications
      .filter((n) => n.user_id === req.user.id)
      .forEach((n) => { n.is_read = true; });
    res.json({ message: 'All notifications marked as read' });
  });

  // POST /api/notifications/send - Admin send notification
  router.post('/send', authMiddleware, (req, res) => {
    if (!['system_admin', 'hospital_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { user_id, title, message, type } = req.body;
    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'user_id, title, and message are required' });
    }

    const notification = {
      id: uuidv4(),
      user_id,
      title,
      message,
      type: type || 'info',
      is_read: false,
      created_at: new Date(),
    };

    db.notifications.push(notification);
    res.status(201).json({ message: 'Notification sent', notification });
  });

  return router;
};
