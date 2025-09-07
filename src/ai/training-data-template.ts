export interface ComprehensiveBusinessData {
  // Basic Business Information
  businessName: string;
  industry: string;
  tagline?: string;
  description: string;
  
  // Services & Products
  mainServices: string[];
  featuredProducts: {
    name: string;
    description: string;
    price?: string;
    features: string[];
  }[];
  
  // Pricing Information
  pricing: {
    startingPrice?: string;
    priceRanges: {
      service: string;
      range: string;
      includes: string[];
    }[];
    paymentOptions: string[];
    discounts?: {
      type: string;
      description: string;
    }[];
  };
  
  // Contact & Business Info
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    businessHours: {
      days: string;
      hours: string;
    }[];
  };
  
  // Sales & Marketing
  uniqueSellingPoints: string[];
  targetAudience: string[];
  competitiveAdvantages: string[];
  testimonials?: {
    text: string;
    author: string;
  }[];
  
  // Support & Policies
  supportInfo: {
    responseTime: string;
    supportChannels: string[];
    commonIssues: {
      issue: string;
      solution: string;
    }[];
  };
  
  policies: {
    refundPolicy?: string;
    deliveryPolicy?: string;
    privacyPolicy?: string;
  };
  
  // Communication Style
  communicationStyle: {
    tone: 'professional' | 'friendly' | 'casual' | 'formal';
    useEmojis: boolean;
    languageStyle: string[];
    brandVoice: string;
  };
}

export function formatTrainingDataForAI(data: Partial<ComprehensiveBusinessData>): string {
  const sections: string[] = [];
  
  // Basic Business Info
  if (data.businessName) {
    sections.push(`BUSINESS NAME: ${data.businessName}`);
  }
  
  if (data.tagline) {
    sections.push(`TAGLINE: ${data.tagline}`);
  }
  
  if (data.description) {
    sections.push(`DESCRIPTION: ${data.description}`);
  }
  
  if (data.industry) {
    sections.push(`INDUSTRY: ${data.industry}`);
  }
  
  // Services & Products
  if (data.mainServices && data.mainServices.length > 0) {
    sections.push(`MAIN SERVICES: ${data.mainServices.join(', ')}`);
  }
  
  if (data.featuredProducts && data.featuredProducts.length > 0) {
    const productsText = data.featuredProducts.map(p => 
      `${p.name}: ${p.description}${p.price ? ` (${p.price})` : ''}`
    ).join(' | ');
    sections.push(`FEATURED PRODUCTS: ${productsText}`);
  }
  
  // Pricing
  if (data.pricing) {
    if (data.pricing.startingPrice) {
      sections.push(`STARTING PRICE: ${data.pricing.startingPrice}`);
    }
    
    if (data.pricing.priceRanges && data.pricing.priceRanges.length > 0) {
      const pricesText = data.pricing.priceRanges.map(pr => 
        `${pr.service}: ${pr.range} (includes: ${pr.includes.join(', ')})`
      ).join(' | ');
      sections.push(`PRICING: ${pricesText}`);
    }
    
    if (data.pricing.paymentOptions && data.pricing.paymentOptions.length > 0) {
      sections.push(`PAYMENT OPTIONS: ${data.pricing.paymentOptions.join(', ')}`);
    }
  }
  
  // Contact Info
  if (data.contact) {
    const contactInfo: string[] = [];
    if (data.contact.phone) contactInfo.push(`Phone: ${data.contact.phone}`);
    if (data.contact.email) contactInfo.push(`Email: ${data.contact.email}`);
    if (data.contact.website) contactInfo.push(`Website: ${data.contact.website}`);
    if (data.contact.address) contactInfo.push(`Address: ${data.contact.address}`);
    
    if (contactInfo.length > 0) {
      sections.push(`CONTACT: ${contactInfo.join(' | ')}`);
    }
    
    if (data.contact.businessHours && data.contact.businessHours.length > 0) {
      const hoursText = data.contact.businessHours.map(h => 
        `${h.days}: ${h.hours}`
      ).join(' | ');
      sections.push(`BUSINESS HOURS: ${hoursText}`);
    }
  }
  
  // Unique Selling Points
  if (data.uniqueSellingPoints && data.uniqueSellingPoints.length > 0) {
    sections.push(`KEY BENEFITS: ${data.uniqueSellingPoints.join(', ')}`);
  }
  
  // Target Audience
  if (data.targetAudience && data.targetAudience.length > 0) {
    sections.push(`TARGET CUSTOMERS: ${data.targetAudience.join(', ')}`);
  }
  
  // Competitive Advantages
  if (data.competitiveAdvantages && data.competitiveAdvantages.length > 0) {
    sections.push(`COMPETITIVE ADVANTAGES: ${data.competitiveAdvantages.join(', ')}`);
  }
  
  // Communication Style
  if (data.communicationStyle) {
    sections.push(`COMMUNICATION TONE: ${data.communicationStyle.tone || 'professional'}`);
    sections.push(`USE EMOJIS: ${data.communicationStyle.useEmojis ? 'Yes' : 'No'}`);
    if (data.communicationStyle.brandVoice) {
      sections.push(`BRAND VOICE: ${data.communicationStyle.brandVoice}`);
    }
  }
  
  // Support Info
  if (data.supportInfo) {
    sections.push(`SUPPORT RESPONSE TIME: ${data.supportInfo.responseTime}`);
    if (data.supportInfo.supportChannels && data.supportInfo.supportChannels.length > 0) {
      sections.push(`SUPPORT CHANNELS: ${data.supportInfo.supportChannels.join(', ')}`);
    }
  }
  
  return sections.join('\n\n');
}

// Smart training data parser - extracts structured data from free text
export function parseTrainingData(rawText: string): Partial<ComprehensiveBusinessData> {
  const data: Partial<ComprehensiveBusinessData> = {};
  
  // Extract business name
  const businessNameMatch = rawText.match(/(?:business name|company name|we are|i am|my business):?\s*([^\n]+)/i);
  if (businessNameMatch) {
    data.businessName = businessNameMatch[1].trim();
  }
  
  // Extract services
  const servicesMatch = rawText.match(/(?:services|we offer|we provide|our services):?\s*([^\n]+)/i);
  if (servicesMatch) {
    data.mainServices = servicesMatch[1].split(/,|and|\|/).map(s => s.trim()).filter(Boolean);
  }
  
  // Extract pricing
  const pricingMatches = rawText.match(/\$[\d,]+|\$[\d,]+-\$[\d,]+|starting at \$[\d,]+|from \$[\d,]+/gi);
  if (pricingMatches) {
    data.pricing = {
      startingPrice: pricingMatches[0],
      priceRanges: [],
      paymentOptions: []
    };
  }
  
  // Extract contact info
  const phoneMatch = rawText.match(/(?:phone|call|contact):?\s*([\+\-\(\)\d\s]+)/i);
  const emailMatch = rawText.match(/(?:email|e-mail):?\s*([^\s\n]+@[^\s\n]+)/i);
  const websiteMatch = rawText.match(/(?:website|site|url):?\s*(https?:\/\/[^\s\n]+|www\.[^\s\n]+)/i);
  
  if (phoneMatch || emailMatch || websiteMatch) {
    data.contact = {
      phone: phoneMatch?.[1]?.trim(),
      email: emailMatch?.[1]?.trim(),
      website: websiteMatch?.[1]?.trim(),
      businessHours: []
    };
  }
  
  // Extract business hours
  const hoursMatch = rawText.match(/(?:hours|open|closed):?\s*([^\n]+)/i);
  if (hoursMatch && data.contact) {
    data.contact.businessHours = [{ days: 'Business Days', hours: hoursMatch[1].trim() }];
  }
  
  return data;
}

// Example comprehensive business data
export const EXAMPLE_BUSINESS_DATA: ComprehensiveBusinessData = {
  businessName: "TechSolutions Pro",
  industry: "Technology Services",
  tagline: "Your Digital Transformation Partner",
  description: "We provide comprehensive technology solutions for businesses looking to modernize their operations and boost efficiency.",
  
  mainServices: [
    "Web Development",
    "Mobile App Development", 
    "Cloud Solutions",
    "Digital Marketing",
    "IT Consulting"
  ],
  
  featuredProducts: [
    {
      name: "Custom Web Development",
      description: "Professional websites tailored to your business needs",
      price: "Starting at $2,999",
      features: ["Responsive Design", "SEO Optimized", "Content Management", "Analytics Integration"]
    },
    {
      name: "Mobile App Development", 
      description: "Native and cross-platform mobile applications",
      price: "Starting at $4,999",
      features: ["iOS & Android", "Cloud Integration", "Push Notifications", "Analytics"]
    }
  ],
  
  pricing: {
    startingPrice: "$999",
    priceRanges: [
      {
        service: "Web Development",
        range: "$2,999 - $9,999",
        includes: ["Custom Design", "CMS Integration", "SEO Setup", "1 Year Support"]
      },
      {
        service: "Mobile Apps",
        range: "$4,999 - $19,999", 
        includes: ["Native Development", "Backend Integration", "Testing", "App Store Submission"]
      }
    ],
    paymentOptions: ["Credit Card", "Bank Transfer", "Payment Plans Available"],
    discounts: [
      { type: "New Client", description: "15% off first project" },
      { type: "Bundle Deal", description: "20% off when combining web + mobile" }
    ]
  },
  
  contact: {
    phone: "+1-555-TECH-PRO",
    email: "hello@techsolutionspro.com",
    website: "www.techsolutionspro.com",
    address: "123 Innovation Drive, Tech City, TC 12345",
    businessHours: [
      { days: "Monday - Friday", hours: "9:00 AM - 6:00 PM EST" },
      { days: "Saturday", hours: "10:00 AM - 2:00 PM EST" },
      { days: "Sunday", hours: "Closed" }
    ]
  },
  
  uniqueSellingPoints: [
    "10+ years of industry experience",
    "100% satisfaction guarantee",
    "Fast 2-week turnaround",
    "Dedicated project manager",
    "Free consultation and quote",
    "Ongoing support and maintenance"
  ],
  
  targetAudience: [
    "Small to medium businesses",
    "Startups looking to scale", 
    "Established companies modernizing",
    "E-commerce businesses",
    "Service professionals"
  ],
  
  competitiveAdvantages: [
    "Faster delivery than competitors",
    "All-in-one service provider",
    "Transparent pricing", 
    "Proven track record",
    "Latest technology stack"
  ],
  
  supportInfo: {
    responseTime: "Within 2 hours during business hours",
    supportChannels: ["WhatsApp", "Email", "Phone", "Live Chat"],
    commonIssues: [
      {
        issue: "Website down or not loading",
        solution: "We provide 24/7 monitoring and immediate fixes for any downtime issues"
      },
      {
        issue: "Need to update content",
        solution: "Easy-to-use content management system with tutorial videos and support"
      }
    ]
  },
  
  policies: {
    refundPolicy: "100% money-back guarantee within 30 days if not satisfied",
    deliveryPolicy: "Projects delivered on time or receive 10% discount on next project",
    privacyPolicy: "We never share your data and maintain strict confidentiality"
  },
  
  communicationStyle: {
    tone: 'professional',
    useEmojis: true,
    languageStyle: ["Clear and concise", "Technical when needed", "Friendly but professional"],
    brandVoice: "Confident, helpful, and solution-oriented"
  }
};
