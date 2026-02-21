# Cron Job Setup for Accounting Period Notifications

This guide explains how to set up a cron job to automatically check accounting periods and send notifications.

## Overview

The `check-period-notifications.ts` script checks all open accounting periods and sends:
- **Reminder notifications**: N days before the period end date
- **Overdue notifications**: For periods past their end date
- **Escalation notifications**: M days after the period end date (sent to administrators)

## Prerequisites

1. ERPNext API credentials configured in `.env.local`
2. Period Closing Config DocType created in ERPNext
3. Email notifications enabled in the configuration

## Manual Execution

To run the script manually:

```bash
npm run check-period-notifications
```

Or directly with ts-node:

```bash
ts-node --project tsconfig.scripts.json scripts/check-period-notifications.ts
```

## Cron Job Setup

### Linux/macOS

1. Open crontab editor:
```bash
crontab -e
```

2. Add the following line to run daily at 9:00 AM:
```bash
0 9 * * * cd /path/to/erp-next-system && /usr/bin/npm run check-period-notifications >> /var/log/period-notifications.log 2>&1
```

Replace `/path/to/erp-next-system` with the actual path to your project.

3. Alternative: Run every hour during business hours (9 AM - 5 PM):
```bash
0 9-17 * * * cd /path/to/erp-next-system && /usr/bin/npm run check-period-notifications >> /var/log/period-notifications.log 2>&1
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create a new task:
   - **Name**: Check Accounting Period Notifications
   - **Trigger**: Daily at 9:00 AM
   - **Action**: Start a program
     - Program: `cmd.exe`
     - Arguments: `/c cd C:\path\to\erp-next-system && npm run check-period-notifications >> period-notifications.log 2>&1`

### Docker/Container Environment

If running in a Docker container, add the cron job to your Dockerfile or docker-compose:

```dockerfile
# Add cron job
RUN echo "0 9 * * * cd /app && npm run check-period-notifications >> /var/log/period-notifications.log 2>&1" > /etc/cron.d/period-notifications
RUN chmod 0644 /etc/cron.d/period-notifications
RUN crontab /etc/cron.d/period-notifications
```

## Systemd Timer (Alternative to Cron)

For modern Linux systems, you can use systemd timers:

1. Create service file `/etc/systemd/system/period-notifications.service`:
```ini
[Unit]
Description=Check Accounting Period Notifications
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/erp-next-system
ExecStart=/usr/bin/npm run check-period-notifications
StandardOutput=journal
StandardError=journal
```

2. Create timer file `/etc/systemd/system/period-notifications.timer`:
```ini
[Unit]
Description=Run period notifications check daily
Requires=period-notifications.service

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. Enable and start the timer:
```bash
sudo systemctl enable period-notifications.timer
sudo systemctl start period-notifications.timer
```

4. Check timer status:
```bash
sudo systemctl status period-notifications.timer
sudo systemctl list-timers
```

## Monitoring and Logs

### View Logs

```bash
# Linux/macOS
tail -f /var/log/period-notifications.log

# Systemd
journalctl -u period-notifications.service -f
```

### Log Rotation

To prevent log files from growing too large, set up log rotation:

Create `/etc/logrotate.d/period-notifications`:
```
/var/log/period-notifications.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 your-user your-group
}
```

## Configuration

The notification timing is controlled by the Period Closing Config in ERPNext:

- `enable_email_notifications`: Enable/disable email notifications
- `reminder_days_before_end`: Days before end date to send reminder (default: 3)
- `escalation_days_after_end`: Days after end date to send escalation (default: 7)

## Troubleshooting

### Script Not Running

1. Check cron service is running:
```bash
sudo systemctl status cron  # Linux
```

2. Check cron logs:
```bash
grep CRON /var/log/syslog  # Linux
```

3. Verify script permissions:
```bash
ls -la scripts/check-period-notifications.ts
```

### No Notifications Sent

1. Check email notifications are enabled in Period Closing Config
2. Verify ERPNext email settings are configured
3. Check users have the correct roles (Accounts Manager, System Manager)
4. Review script output logs for errors

### API Connection Issues

1. Verify `.env.local` has correct ERPNext credentials:
   - `ERPNEXT_API_URL`
   - `ERP_API_KEY`
   - `ERP_API_SECRET`

2. Test API connection manually:
```bash
curl -H "Authorization: token API_KEY:API_SECRET" http://localhost:8000/api/resource/Accounting Period
```

## Best Practices

1. **Run during business hours**: Schedule the job when staff are available to act on notifications
2. **Monitor logs regularly**: Check for errors and failed notifications
3. **Test before production**: Run manually first to verify configuration
4. **Set up alerts**: Configure monitoring to alert if the job fails
5. **Document changes**: Keep track of any configuration changes

## Example Output

```
============================================================
Checking Accounting Periods for Notifications
Run Time: 2024-01-15T09:00:00.000Z
============================================================

Configuration loaded:
  Email notifications enabled: true
  Reminder days before end: 3
  Escalation days after end: 7

Found 2 open period(s)

Checking period: January 2024
  Company: Batasku
  End Date: 2024-01-31
  Days from end: 3
  → Sending reminder notification (3 days before end)

Checking period: December 2023
  Company: Batasku
  End Date: 2023-12-31
  Days from end: -15
  → No notification needed at this time

============================================================
Notification Summary:
  Reminders sent: 1
  Overdue notifications sent: 0
  Escalations sent: 0
  Total notifications: 1
============================================================

✓ Job completed successfully
```
