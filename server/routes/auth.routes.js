const express = require('express');
const supabase = require('../supabaseClient');
const router = express.Router();

// POST /api/auth/reset-password
// Uses the user's access token to identify them, then updates password via admin API
router.post('/reset-password', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Verify the token and get the user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please request a new reset link.' });
  }

  // Update password using admin API (requires service_role key)
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Password updated successfully.' });
});

// POST /api/auth/change-password
// Authenticated user changes their own password (requires current password)
router.post('/change-password', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid session.' });
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Password updated successfully.' });
});

// POST /api/auth/change-email
// Authenticated user changes their email (requires current password)
router.post('/change-email', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  const { newEmail, currentPassword } = req.body;

  if (!newEmail) {
    return res.status(400).json({ error: 'New email is required.' });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid session.' });
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { email: newEmail });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Email updated successfully.' });
});

module.exports = router;
