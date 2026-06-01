import db from '../models/index.js';

const { Gym, Member, User } = db;

export const getGymByJoinCode = async (req, res) => {
  try {
    const { join_code } = req.params;
    
    const gym = await Gym.findOne({
      where: { unique_join_code: join_code },
      attributes: ['gym_id', 'gym_name', 'address', 'city', 'state', 'country', 'contact_email', 'contact_phone', 'unique_join_code']
    });
    
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    
    res.json(gym);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const checkMemberEmail = async (req, res) => {
  try {
    const { email, join_code } = req.params;
    const gym = await Gym.findOne({ where: { unique_join_code: join_code } });
    if (!gym) {
      return res.status(400).json({ error: 'Invalid gym code provided.' });
    }
    const user = await User.findOne({ where: { email }, attributes: ['user_id', 'email', 'role', 'gym_id'] });
    if (user) {
      const member = await Member.findOne({ where: { user_id: user.user_id, gym_id: gym.gym_id }, attributes: ['member_id', 'member_status'] });
      if (member) {
        return res.json({
          exists: true,
          member_status: member.member_status,
          message: 'This email is already an active member for this gym.'
        });
      } else {
        return res.json({
          exists: true,
          member_status: null,
          message: 'This email is registered as a user, but not for this gym.'
        });
      }
    }
    res.json({ exists: false, message: 'Email not found for this gym.' });
  } catch (error) {
    console.error('Error checking member email:', error);
    res.status(500).json({ error: error.message });
  }
};