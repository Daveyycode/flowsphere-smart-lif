import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function TermsOfService() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto pb-8"
    >
      <Card>
        <CardContent className="p-4 sm:p-6 md:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8">Last updated: January 2024</p>

          <ScrollArea className="h-[calc(100vh-300px)] pr-4">
            <div className="space-y-6 sm:space-y-8 text-sm sm:text-base">
              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  By accessing and using FlowSphere ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  FlowSphere provides a unified platform for smart home management, family safety tracking, and AI-powered automation. Your use of the Service is subject to these Terms of Service and our Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">2. User Accounts</h2>
                <h3 className="text-base sm:text-lg font-medium mb-2">2.1 Account Creation</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You must provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">2.2 Account Security</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You agree to immediately notify FlowSphere of any unauthorized use of your account. We cannot and will not be liable for any loss or damage arising from your failure to comply with account security obligations.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">2.3 Account Termination</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to suspend or terminate your account if you violate these Terms of Service or engage in fraudulent, abusive, or illegal activities.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">3. Service Usage</h2>
                <h3 className="text-base sm:text-lg font-medium mb-2">3.1 Acceptable Use</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">You agree to use FlowSphere only for lawful purposes. You must not:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-3">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe upon intellectual property rights</li>
                  <li>Transmit malicious code or viruses</li>
                  <li>Attempt to gain unauthorized access to systems</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Use the Service for surveillance without consent</li>
                </ul>
                <h3 className="text-base sm:text-lg font-medium mb-2">3.2 Smart Device Integration</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You are responsible for ensuring your smart devices are properly secured and configured. FlowSphere is not liable for damages resulting from device malfunctions or security vulnerabilities in third-party devices.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">3.3 Family Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You must obtain explicit consent from all family members before enabling location tracking features. You agree to use tracking features responsibly and in accordance with applicable privacy laws.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">4. Subscription and Billing</h2>
                <h3 className="text-base sm:text-lg font-medium mb-2">4.1 Subscription Plans</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  FlowSphere offers Free, Premium ($9.99/month), and Family ($19.99/month) subscription tiers. Pricing is subject to change with 30 days notice to existing subscribers.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">4.2 Billing</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Subscriptions are billed in advance on a monthly or annual basis. You authorize FlowSphere to charge your payment method for all subscription fees. Failed payments may result in service suspension.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">4.3 Cancellation and Refunds</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. We offer a 14-day money-back guarantee for first-time subscribers.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">4.4 Free Trial</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Premium features may be offered with a free trial period. After the trial, your payment method will be charged unless you cancel before the trial ends.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">5. Data and Privacy</h2>
                <h3 className="text-base sm:text-lg font-medium mb-2">5.1 Data Collection</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We collect data necessary to provide the Service, including device status, location data, and usage analytics. See our Privacy Policy for detailed information about data collection and usage.
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">5.2 Data Storage</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Your data is stored using industry-standard encryption. CCTV footage retention varies by subscription tier: 24 hours (Free), 30 days (Premium), 90 days (Family).
                </p>
                <h3 className="text-base sm:text-lg font-medium mb-2">5.3 Data Ownership</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You retain ownership of your data. Upon account deletion, your personal data will be permanently deleted within 30 days, except where required by law.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">6. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  The Service, including its original content, features, and functionality, is owned by FlowSphere and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Our trademarks may not be used in connection with any product or service without prior written consent.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">7. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  FlowSphere shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service, including but not limited to device failures, data loss, security breaches, or unauthorized access.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We do not guarantee uninterrupted or error-free service. The Service is provided "as is" without warranties of any kind.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">8. Emergency Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  FlowSphere is not a substitute for emergency services. In case of emergency, always contact local emergency services (911 in the US) directly. Do not rely on FlowSphere notifications for emergency response.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">9. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. Material changes will be notified via email or in-app notification 30 days before taking effect. Continued use of the Service after changes constitutes acceptance of new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">10. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">11. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For questions about these Terms, please contact us at:
                </p>
                <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">FlowSphere Support</p>
                  <p className="text-muted-foreground">Email: legal@flowsphere.com</p>
                  <p className="text-muted-foreground">Address: 123 Tech Lane, San Francisco, CA 94105</p>
                </div>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}
