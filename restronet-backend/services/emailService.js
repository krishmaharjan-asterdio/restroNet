const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = process.env.SMTP_FROM || 'RestroNet <noreply@restronet.com>';
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const send = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    logger.error(`Email send failed to ${mailOptions.to}: ${err.message}`);
  }
};

const sendReservationReminder = async (user, reservation, venue, hoursUntil) => {
  const isImminent = hoursUntil <= 2;
  const subject = isImminent
    ? `Your reservation at ${venue.name} is in about 2 hours`
    : `Reminder: Your table at ${venue.name} is tomorrow`;

  const dateStr = new Date(reservation.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  await send({
    from: FROM,
    to: user.email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">RestroNet</h2>
        <p>Hi ${esc(user.name)},</p>
        <p>${isImminent ? "Your reservation is coming up soon!" : "Just a friendly reminder about your upcoming reservation."}</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
          <strong>${esc(venue.name)}</strong><br/>
          ${esc(venue.address?.street || '')}, ${esc(venue.address?.city || '')}<br/>
          <strong>Date:</strong> ${esc(dateStr)}<br/>
          <strong>Time:</strong> ${esc(reservation.time)}<br/>
          <strong>Guests:</strong> ${esc(reservation.guests)}
        </div>
        ${reservation.specialRequests ? `<p><strong>Special requests:</strong> ${esc(reservation.specialRequests)}</p>` : ''}
        <p><a href="${BASE_URL}/my-reservations" style="color:#fa6500">View or manage your reservation</a></p>
        <p style="color:#999;font-size:12px">Bon appétit — RestroNet</p>
      </div>
    `,
  });
};

const sendReviewRequest = async (user, venue) => {
  await send({
    from: FROM,
    to: user.email,
    subject: `How was your experience at ${venue.name}?`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">RestroNet</h2>
        <p>Hi ${esc(user.name)},</p>
        <p>We hope you enjoyed your visit to <strong>${esc(venue.name)}</strong>. Your feedback helps other diners discover great restaurants.</p>
        <p>
          <a href="${BASE_URL}/restaurant/${encodeURIComponent(venue.slug)}?review=true"
             style="background:#fa6500;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
            Leave a Review
          </a>
        </p>
        <p style="color:#999;font-size:12px">You're receiving this because you recently dined via RestroNet.</p>
      </div>
    `,
  });
};

const sendDailyDigest = async (user, venues) => {
  if (!venues?.length) return;

  const venueCards = venues.map(v => `
    <div style="margin-bottom:16px;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <div style="padding:12px">
        <strong style="font-size:16px">${esc(v.name)}</strong>
        <p style="margin:4px 0;color:#666;font-size:13px">
          ${(v.cuisines || []).map(c => esc(c.name || c)).join(', ')} · ${esc(v.address?.city || 'Kathmandu')}
        </p>
        <p style="margin:4px 0;font-size:13px">⭐ ${(v.averageRating || 0).toFixed(1)}</p>
        <a href="${BASE_URL}/restaurant/${encodeURIComponent(v.slug)}"
           style="color:#fa6500;font-size:13px;text-decoration:none;font-weight:600">
          View Restaurant →
        </a>
      </div>
    </div>
  `).join('');

  await send({
    from: FROM,
    to: user.email,
    subject: `Your daily picks from RestroNet`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">Today's Picks For You</h2>
        <p>Hi ${esc(user.name)}, here are today's restaurant recommendations based on your taste:</p>
        ${venueCards}
        <p><a href="${BASE_URL}/discover" style="color:#fa6500">Explore more on RestroNet</a></p>
        <p style="color:#999;font-size:11px">
          <a href="${BASE_URL}/profile" style="color:#999">Manage email preferences</a>
        </p>
      </div>
    `,
  });
};

const sendOwnerWeeklyReport = async (owner, stats) => {
  await send({
    from: FROM,
    to: owner.email,
    subject: `Your weekly RestroNet report — ${stats.venueName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">Weekly Report: ${esc(stats.venueName)}</h2>
        <p>Hi ${esc(owner.name)}, here's how your restaurant performed this week:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f9f9f9">
            <td style="padding:10px;border:1px solid #eee"><strong>Reservations</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.reservationCount}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee"><strong>New Reviews</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.reviewCount}</td>
          </tr>
          <tr style="background:#f9f9f9">
            <td style="padding:10px;border:1px solid #eee"><strong>Avg Rating This Week</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'} ⭐</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee"><strong>Rating vs Last Week</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.ratingDelta > 0 ? '+' : ''}${stats.ratingDelta != null ? stats.ratingDelta.toFixed(2) : 'N/A'}</td>
          </tr>
          <tr style="background:#f9f9f9">
            <td style="padding:10px;border:1px solid #eee"><strong>Total Guests</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.totalGuests}</td>
          </tr>
        </table>
        <p><a href="${BASE_URL}" style="color:#fa6500">Manage your listing on RestroNet</a></p>
      </div>
    `,
  });
};

const sendAdminStaleAlert = async (admin, staleVenues) => {
  const rows = staleVenues.map(v => `
    <tr>
      <td style="padding:8px;border:1px solid #eee">${esc(v.name)}</td>
      <td style="padding:8px;border:1px solid #eee">${esc(v.staleFlag?.reason || 'Unknown')}</td>
      <td style="padding:8px;border:1px solid #eee">${v.staleFlag?.flaggedAt ? new Date(v.staleFlag.flaggedAt).toLocaleDateString() : ''}</td>
    </tr>
  `).join('');

  await send({
    from: FROM,
    to: admin.email,
    subject: `RestroNet: ${staleVenues.length} listing(s) need attention`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">Listings Needing Attention</h2>
        <p>Hi ${esc(admin.name)}, the following venues have been flagged for review:</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f9f9f9">
              <th style="padding:8px;border:1px solid #eee;text-align:left">Venue</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Reason</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Flagged On</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p><a href="${BASE_URL}/admin/restaurants" style="color:#fa6500">Review in Admin Dashboard</a></p>
      </div>
    `,
  });
};

module.exports = {
  sendReservationReminder,
  sendReviewRequest,
  sendDailyDigest,
  sendOwnerWeeklyReport,
  sendAdminStaleAlert,
};
