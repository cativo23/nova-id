# Email Configuration & Testing Guide

**Complete guide for email functionality in Nova ID**

---

## 📧 Email System Overview

Nova ID uses **Kratos** for identity management and **MailHog** for email testing in development. The email system handles:

- **Registration verification** - Confirm new user emails
- **Password recovery** - Reset forgotten passwords
- **Account notifications** - Security and status updates

**Production Setup:** Configure SMTP settings in `config/kratos/kratos.${ENVIRONMENT}.yml`

---

## ⚙️ Configuration

### Development (MailHog)

Nova ID uses MailHog for local email testing:

```yaml
# config/kratos/kratos.${ENVIRONMENT}.yml
courier:
  smtp:
    connection_uri: smtp://mailhog:1025/?disable_starttls=true
    from_address: noreply@cativo.dev
```

### Production (SMTP)

For production, configure real SMTP:

```yaml
courier:
  smtp:
    connection_uri: smtp://username:password@smtp.gmail.com:587/
    from_address: noreply@yourdomain.com
```

### MailHog Access Points

- **Web UI**: http://localhost:8025
- **SMTP Port**: localhost:1025
- **API**: http://localhost:8025/api/v2/messages

---

## 🧪 Testing Email Functionality

### Automated Testing

Use the provided test scripts:

```bash
# Test basic email sending
./scripts/test-email-sending.sh

# Test with real user account
./scripts/test-email-with-real-user.sh

# Comprehensive stack test (includes email)
./scripts/test-stack-comprehensive.sh
```

### Manual Testing

#### Test Registration Emails

1. **Open the registration page**: http://localhost:8082
2. **Register a new account** with a real email
3. **Check MailHog**: http://localhost:8025
4. **Verify email** using the link in the email

#### Test Password Recovery

```bash
# Clear previous emails
curl -X DELETE http://localhost:8025/api/v1/messages

# Create recovery flow
FLOW_ID=$(curl -s http://localhost:4433/self-service/recovery/api | jq -r '.id')

# Submit recovery request (use a real user email!)
curl -X POST "http://localhost:4433/self-service/recovery?flow=${FLOW_ID}" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-real-user@example.com","method":"code"}'

# Check MailHog for the email
curl http://localhost:8025/api/v2/messages | jq '.total'
```

### Email Types Tested

- ✅ **Registration verification** - Sent when users register
- ✅ **Password recovery** - Sent when users reset passwords
- ✅ **Account updates** - Sent for security changes

---

## 🔧 Troubleshooting

### Common Issues

#### **No Emails Sent for Unknown Addresses**

**Problem**: Kratos doesn't send emails to non-existent email addresses.

**Why**: Security feature to prevent email enumeration attacks.

**Solution**: Always test with email addresses that exist in your system.

```bash
# This will NOT send an email (security feature)
curl -X POST "http://localhost:4433/self-service/recovery?flow=${FLOW_ID}" \
  -d '{"email":"nonexistent@example.com","method":"code"}'

# Check logs - you'll see "was_notified": false
docker-compose logs kratos | grep "recovery"
```

#### **Admin Recovery Code Doesn't Send Emails**

**Problem**: `/admin/recovery/code` creates codes but doesn't send emails.

**Why**: By design - admin endpoint only creates codes.

**Solutions**:

1. **Use Self-Service Recovery** (recommended):
```javascript
// Trigger email sending programmatically
async function sendRecoveryEmail(userEmail) {
  const flow = await createRecoveryFlow();
  await updateRecoveryFlow(flow.id, {
    email: userEmail,
    method: 'code'
  });
}
```

2. **Manual Code Distribution**: Display the code to admin for manual sharing

#### **Courier Worker Not Running**

**Problem**: Emails not being sent.

**Check**:
```bash
# Verify courier is running
docker-compose logs kratos | grep "Courier worker started"

# Check kratos configuration has --watch-courier
docker-compose ps kratos
```

#### **SMTP Connection Issues**

**Problem**: Connection refused or authentication failed.

**Check**:
```bash
# Test SMTP connection
telnet localhost 1025  # For MailHog
telnet smtp.gmail.com 587  # For production
```

### Verification Steps

1. **Check Service Health**:
```bash
curl http://localhost:4434/health/ready
curl http://localhost:8025/api/v2/messages
```

2. **Verify Configuration**:
```bash
# Check Kratos config
docker-compose exec kratos cat /etc/config/kratos/kratos.${ENVIRONMENT}.yml | grep -A 10 courier
```

3. **Monitor Logs**:
```bash
# Follow email-related logs
docker-compose logs -f kratos | grep -i courier
```

---

## 📊 Email Analytics

### Monitoring Email Delivery

```bash
# Check recent emails
curl http://localhost:8025/api/v2/messages | jq '.items[0]'

# Count emails by type
curl http://localhost:8025/api/v2/messages | jq '.items[].Content.Headers.Subject[0]' | sort | uniq -c
```

### Production Monitoring

- **Delivery rates** - Track successful sends
- **Bounce rates** - Monitor failed deliveries
- **Open rates** - User engagement (if using tracking)
- **Spam complaints** - Monitor reputation

---

## 🔒 Security Considerations

### Email Security Best Practices

1. **Use HTTPS URLs** in email templates
2. **Implement rate limiting** on email endpoints
3. **Validate email addresses** before sending
4. **Use secure SMTP** (TLS/SSL) in production
5. **Monitor for abuse** (spam, enumeration attacks)

### Anti-Abuse Measures

- **Rate limiting** on recovery endpoints
- **No emails to unknown addresses** (enumeration protection)
- **Secure token generation** for verification links
- **Expiration of recovery codes** (default: 1 hour)

---

## 🚀 Production Deployment

### Email Service Configuration

1. **Choose SMTP Provider**:
   - SendGrid, Mailgun, AWS SES, or self-hosted
   - Consider deliverability and cost

2. **Configure DNS**:
   - SPF records for domain authentication
   - DKIM for email signing
   - DMARC for policy enforcement

3. **Template Customization**:
   - Brand emails with your logo/colors
   - Include unsubscribe links
   - Add contact information

### Scaling Considerations

- **Queue emails** for high-volume scenarios
- **Implement retry logic** for failed sends
- **Monitor delivery metrics** and alert on failures
- **Backup email provider** for redundancy

---

## 📝 API Reference

### Email-Related Endpoints

#### Self-Service Recovery
```bash
# Create recovery flow
GET /self-service/recovery/api

# Submit recovery request
POST /self-service/recovery?flow={flow_id}
```

#### Admin Recovery
```bash
# Create recovery code (no email sent)
POST /admin/recovery/code
```

#### Verification
```bash
# Create verification flow
GET /self-service/verification/api

# Submit verification
POST /self-service/verification?flow={flow_id}
```

---

## 🐛 Debugging

### Debug Commands

```bash
# Clear all emails
curl -X DELETE http://localhost:8025/api/v1/messages

# Get email count
curl http://localhost:8025/api/v2/messages | jq '.total'

# View latest email
curl http://localhost:8025/api/v2/messages | jq '.items[0].Content.Body'

# Check Kratos courier status
docker-compose exec kratos kratos courier watch --config /etc/config/kratos/kratos.${ENVIRONMENT}.yml
```

### Log Analysis

```bash
# Email sending logs
docker-compose logs kratos | grep "Courier sent out message"

# Recovery flow logs
docker-compose logs kratos | grep "recovery"

# Verification logs
docker-compose logs kratos | grep "verification"
```

---

## Related documentation

- [Getting Started](GETTING_STARTED.md) — Installation and first login
- [Operations](OPERATIONS.md) — Running services, testing, troubleshooting