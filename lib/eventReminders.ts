import { EVENTS } from "@/lib/events";
import { sendEventReminderEmail } from "@/lib/email";

/**
 * The nudge the day before an event.
 *
 * Scheduled at the moment somebody RSVPs, which is often weeks out, so
 * Resend holds it and there is nothing to poll. The send time is derived
 * from the event's own date rather than a delay from now, which is the
 * only version that survives somebody booking three months early.
 *
 * Silent on every reason not to send, because an RSVP must never fail
 * over a reminder: an event that has already happened, one without a
 * date, one less than a day away, or an address we cannot use.
 */

/** 5pm Pacific the day before. Late enough to be the last thing they read. */
const REMINDER_HOUR_PT = 17;

export function reminderTimeFor(startDate: string, now = new Date()): Date | null {
  // startDate is a plain yyyy-mm-dd, which is a civil date in San Diego
  // rather than an instant. Noon UTC on the day before lands safely
  // inside that day whichever way the offset goes, and the hour is then
  // pinned properly below.
  const dayBefore = new Date(`${startDate}T12:00:00Z`);
  if (Number.isNaN(dayBefore.getTime())) return null;
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

  const hourThere = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      hour12: false,
    }).format(dayBefore),
  );
  const sendAt = new Date(dayBefore.getTime() + ((REMINDER_HOUR_PT - hourThere) % 24) * 3_600_000);

  // Booked too late for a day-before reminder to mean anything. Resend
  // would reject a send time in the past anyway, and a reminder that
  // arrives after the event is worse than none.
  if (sendAt.getTime() <= now.getTime() + 60_000) return null;
  return sendAt;
}

/** Arrange the reminder for one RSVP. Returns the Resend id, if any. */
export async function scheduleEventReminder(input: {
  eventId: string;
  to: string;
  name: string | null;
}): Promise<string | null> {
  const event = EVENTS.find((e) => e.id === input.eventId);
  if (!event?.startDate) return null;

  const sendAt = reminderTimeFor(event.startDate);
  if (!sendAt) return null;

  return sendEventReminderEmail({
    to: input.to,
    name: input.name,
    eventTitle: event.title,
    eventDateLabel: event.dateLabel,
    eventTimeLabel: event.timeLabel,
    eventVenue: event.venue,
    eventLocation: event.location,
    scheduledAt: sendAt.toISOString(),
  });
}
