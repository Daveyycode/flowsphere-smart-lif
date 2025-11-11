import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Eye, Lock, Database, Users, Bell } from '@phosphor-icons/react'

export function PrivacyPolicy() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto pb-8"
    >
      <Card>
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" weight="duotone" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Last updated: January 2024</p>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-accent/10 border border-accent/20 rounded-lg mb-6 sm:mb-8">
            <p className="text-xs sm:text-sm text-foreground">
              <strong>Privacy First:</strong> FlowSphere is designed with privacy at its core. Your data is encrypted, stored locally when possible, and never sold to third parties.
            </p>
          </div>

          <ScrollArea className="h-[calc(100vh-350px)] pr-4">
            <div className="space-y-6 sm:space-y-8 text-sm sm:text-base">
              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Eye className="w-5 h-5 text-accent" weight="duotone" />
                  <h2 className="text-xl sm:text-2xl font-semibold">1. Information We Collect</h2>
                </div>
                
                <h3 className="text-base sm:text-lg font-medium mb-2">1.1 Account Information</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">When you create an account, we collect:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li>Name and email address</li>
                  <li>Password (encrypted and never stored in plain text)</li>
                  <li>Profile picture (optional)</li>
                  <li>Payment information (processed securely by third-party providers)</li>
                </ul>

                <h3 className="text-base sm:text-lg font-medium mb-2">1.2 Device Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">To provide smart home functionality, we collect:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li>Device types, names, and room assignments</li>
                  <li>Device status (on/off, temperature, brightness, etc.)</li>
                  <li>Device usage patterns and automation triggers</li>
                  <li>Energy consumption data</li>
                </ul>

                <h3 className="text-base sm:text-lg font-medium mb-2">1.3 Location Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">With your explicit consent, we collect:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li>Real-time GPS location of family members who opt-in</li>
                  <li>Location history for safety zone alerts</li>
                  <li>Home address for weather and automation features</li>
                </ul>

                <h3 className="text-base sm:text-lg font-medium mb-2">1.4 CCTV and Camera Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">From connected security cameras:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li>Video recordings and snapshots</li>
                  <li>Motion detection events and timestamps</li>
                  <li>Camera settings and configurations</li>
                </ul>

                <h3 className="text-base sm:text-lg font-medium mb-2">1.5 Usage Analytics</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">To improve the Service:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>App usage patterns and feature interactions</li>
                  <li>Performance metrics and error logs</li>
                  <li>Device type and operating system</li>
                  <li>IP address and browser information</li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Database className="w-5 h-5 text-accent" weight="duotone" />
                  <h2 className="text-xl sm:text-2xl font-semibold">2. How We Use Your Information</h2>
                </div>
                
                <p className="text-muted-foreground leading-relaxed mb-2">We use collected information to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Provide the Service:</strong> Control devices, track family safety, send notifications, and enable automations</li>
                  <li><strong>AI Features:</strong> Generate personalized insights, morning briefs, and automation recommendations</li>
                  <li><strong>Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
                  <li><strong>Communication:</strong> Send service updates, security alerts, and promotional content (opt-out available)</li>
                  <li><strong>Improvement:</strong> Analyze usage patterns to enhance features and user experience</li>
                  <li><strong>Support:</strong> Respond to inquiries and troubleshoot issues</li>
                  <li><strong>Legal Compliance:</strong> Fulfill legal obligations and enforce Terms of Service</li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Lock className="w-5 h-5 text-accent" weight="duotone" />
                  <h2 className="text-xl sm:text-2xl font-semibold">3. Data Security and Storage</h2>
                </div>
                
                <h3 className="text-base sm:text-lg font-medium mb-2">3.1 Encryption</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. End-to-end encryption is used for sensitive communications like family location data.
                </p>

                <h3 className="text-base sm:text-lg font-medium mb-2">3.2 Local-First Storage</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When possible, data is stored locally on your device using the browser's secure storage. This includes preferences, automation rules, and temporary device states. Only essential data is synced to our servers.
                </p>

                <h3 className="text-base sm:text-lg font-medium mb-2">3.3 Data Retention</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">We retain data as follows:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li><strong>Account data:</strong> Until account deletion + 30 days</li>
                  <li><strong>CCTV footage:</strong> 24 hours (Free), 30 days (Premium), 90 days (Family)</li>
                  <li><strong>Location history:</strong> 90 days, then anonymized</li>
                  <li><strong>Device logs:</strong> 6 months for troubleshooting</li>
                  <li><strong>Analytics:</strong> 2 years in anonymized form</li>
                </ul>

                <h3 className="text-base sm:text-lg font-medium mb-2">3.4 Access Controls</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Access to user data is strictly limited to authorized personnel who need it to provide support or maintain the Service. All access is logged and monitored.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Users className="w-5 h-5 text-accent" weight="duotone" />
                  <h2 className="text-xl sm:text-2xl font-semibold">4. Data Sharing and Disclosure</h2>
                </div>
                
                <h3 className="text-base sm:text-lg font-medium mb-2">4.1 We Never Sell Your Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  FlowSphere does not sell, rent, or trade your personal information to third parties for marketing purposes. Your privacy is not for sale.
                </p>

                <h3 className="text-base sm:text-lg font-medium mb-2">4.2 Service Providers</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">We share limited data with trusted service providers who help us operate:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li><strong>Cloud hosting:</strong> AWS (data storage and computing)</li>
                  <li><strong>Payment processing:</strong> Stripe (payment information only)</li>
                  <li><strong>Email service:</strong> SendGrid (email addresses for notifications)</li>
                  <li><strong>Analytics:</strong> Anonymized usage data only</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  All service providers are contractually obligated to protect your data and use it only for specified purposes.
                </p>

                <h3 className="text-base sm:text-lg font-medium mb-2">4.3 Legal Requirements</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may disclose information if required by law, court order, or to protect the rights, property, or safety of FlowSphere, our users, or the public.
                </p>

                <h3 className="text-base sm:text-lg font-medium mb-2">4.4 Family Sharing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  In Family plan accounts, the account owner can view location data and device usage of family members who have explicitly consented to sharing.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Bell className="w-5 h-5 text-accent" weight="duotone" />
                  <h2 className="text-xl sm:text-2xl font-semibold">5. Your Privacy Rights</h2>
                </div>
                
                <p className="text-muted-foreground leading-relaxed mb-2">You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-4">
                  <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                  <li><strong>Export:</strong> Download your data in a portable format (JSON/CSV)</li>
                  <li><strong>Opt-out:</strong> Disable location tracking, analytics, or marketing emails</li>
                  <li><strong>Restrict:</strong> Limit how we process certain types of data</li>
                  <li><strong>Object:</strong> Object to data processing for specific purposes</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  To exercise these rights, visit Settings → Privacy or contact privacy@flowsphere.com.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">6. Cookies and Tracking</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">We use cookies and similar technologies for:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                  <li><strong>Essential cookies:</strong> Authentication and session management (required)</li>
                  <li><strong>Preference cookies:</strong> Remember your settings and choices</li>
                  <li><strong>Analytics cookies:</strong> Understand how you use the Service (opt-out available)</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  You can control cookie preferences through your browser settings or our cookie consent banner.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">7. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  FlowSphere is not intended for children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us immediately.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Family tracking features for children 13-17 require parental consent and supervision by the account owner.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">8. International Data Transfers</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  FlowSphere operates globally. If you access the Service from outside the United States, your data may be transferred to and stored in the US. We use appropriate safeguards like Standard Contractual Clauses to protect your data.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  For EU users, we comply with GDPR requirements. For California residents, we comply with CCPA.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">9. Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  FlowSphere integrates with third-party smart home devices and services. Their privacy practices are governed by their own privacy policies, which we encourage you to review.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We are not responsible for the privacy practices of third-party device manufacturers or services.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">10. Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We may update this Privacy Policy periodically. Material changes will be notified via email or in-app notification at least 30 days before taking effect.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Continued use of the Service after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">11. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  For privacy-related questions, concerns, or to exercise your rights:
                </p>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">FlowSphere Privacy Team</p>
                  <p className="text-muted-foreground">Email: privacy@flowsphere.com</p>
                  <p className="text-muted-foreground">Address: 123 Tech Lane, San Francisco, CA 94105</p>
                  <p className="text-muted-foreground mt-2">Data Protection Officer: dpo@flowsphere.com</p>
                </div>
              </section>

              <div className="pt-6 sm:pt-8 border-t border-border/50">
                <p className="text-xs sm:text-sm text-muted-foreground italic">
                  Your trust is our top priority. We're committed to transparency and protecting your privacy every step of the way.
                </p>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}
