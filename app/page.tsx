"use client"

import banner from '@/assets/banner_full.svg'
import loader1 from '@/assets/loader_1.svg'
import loader2 from '@/assets/loader_2.svg'
import loader3 from '@/assets/loader_3.svg'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { AuthButton } from './components/auth/cards/card'
import Navbar from './components/global/Navbar'

// Accordion data
const accordionData = [
  {
    title: "WHY CHOOSE US?",
    content: "CashDrive isn't just a file host — it's a monetization engine. With x402, people can pay for your content without accounts or subscriptions. Our AI helps you create new content, and because we run on open MCP servers, any AI agent can discover and pay for your files too. Creators earn. Curators get rewarded. Copyright worries? Gone."
  },
  {
    title: "HOW DO I EARN FROM MY FILES?",
    content: "Simply upload a file, list it on the marketplace, and share the link. When someone accesses it using x402, you get paid — instantly and directly. No signups, no platform fees, just pure creator revenue."
  },
  {
    title: "WHAT IS X402?",
    content: "x402 is a new internet payment standard that lets anyone pay for digital content via API, without needing accounts or subscriptions. It’s fast, secure, and perfect for microtransactions — ideal for creators and developers."
  },
  {
    title: "HOW DOES THE AI AGENT HELP?",
    content: "Our AI acts as your creative partner — generating new content ideas, organizing your drive, and even producing files you can sell. It’s like having an assistant who helps you earn more, 24/7."
  },
  {
    title: "CAN OTHER AIs USE MY CONTENT?",
    content: "Yes! Since the marketplace is accessible via MCP servers, other AI agents can find and curate your content. When they do, they pay you via x402 — so even bots help you earn, with no risk of copyright abuse."
  },
  {
    title: "IS THIS SAFE AND PRIVATE?",
    content: "Yes. Your payments are decentralized and secure through the x402 protocol. And since there's no need for accounts or logins, your data and identity stay yours."
  }
];

const FeatureCard = ({ title, description, icon }: { title: string; description: string; icon: any }) => (
  <div className="bg-amber-100 border-2 border-black brutal-shadow-left hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all duration-300 p-6">
    <div className="flex items-start gap-4">
      <Image src={icon} alt="icon" className="w-12 h-12 slow-spin" />
      <div>
        <h3 className="font-anton text-2xl mb-2">{title}</h3>
        <p className="font-freeman text-sm">{description}</p>
      </div>
    </div>
  </div>
);

const Accordion = ({ title, content, isOpen, onClick }: { title: string; content: string; isOpen: boolean; onClick: () => void }) => (
  <div className="border-2 border-black bg-white">
    <button
      className={`w-full p-4 text-left font-anton text-xl flex justify-between items-center ${isOpen ? 'bg-primary' : 'bg-amber-100'}`}
      onClick={onClick}
    >
      {title}
      <span className="font-freeman text-2xl">{isOpen ? '−' : '+'}</span>
    </button>
    {isOpen && (
      <div className="p-4 font-freeman bg-white border-t-2 border-black">
        {content}
      </div>
    )}
  </div>
);

const ProcessStep = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="relative flex items-start gap-4 group">
    <div className="w-12 h-12 bg-primary border-2 border-black brutal-shadow-center flex items-center justify-center font-anton text-2xl group-hover:translate-y-1 group-hover:brutal-shadow-left transition-all">
      {number}
    </div>
    <div className="flex-1">
      <h3 className="font-anton text-xl mb-1">{title}</h3>
      <p className="font-freeman text-sm">{description}</p>
    </div>
  </div>
);

const MarqueeText = () => (
  <div className="overflow-hidden py-3 bg-primary border-2 border-black brutal-shadow-left">
    <div className="flex space-x-4 animate-[marquee_20s_linear_infinite]">
      {Array(5).fill("CREATOR SPOTLIGHT • FEATURED SELLERS • TOP PRODUCTS • ").map((text, i) => (
        <span key={i} className="text-2xl font-anton whitespace-nowrap">{text}</span>
      ))}
    </div>
  </div>
);

const Test = () => {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  return (
    <div className='min-h-screen bg-white flex flex-col items-center justify-start pt-16'>
      <Navbar/>
      
      {/* Hero Section */}
      <div className='w-screen h-[400px] max-md:h-[300px] relative overflow-hidden border-b-2 border-black'>
        <Image src={banner} alt='banner' className='absolute bottom-0 left-1/2 -translate-x-1/2 w-[200vw] translate-y-1/2 origin-center slow-spin scale-[2] max-md:scale-[5]' />
        <div className='absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center'>
          <h1 className='heading-text-3 max-md:heading-text-2 text-8xl max-sm:text-5xl font-anton'>
            CA<span className='text-secondary text-9xl max-sm:text-6xl'>$</span>H DRIVE
          </h1>
          <AuthButton/>
        </div>
      </div>

      {/* Features Section */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16 relative">
        <h2 className="heading-text-2 text-6xl font-anton text-center mb-12">
          FEATURES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={loader1}
            title="MONETIZE YOUR FILES"
            description="Upload your files to the drive and list them on our marketplace — earn directly with x402 payments, no signups or subscriptions required."
          />
          <FeatureCard
            icon={loader2}
            title="BUILT-IN AI ASSISTANT"
            description="Our AI agent helps you brainstorm, create, and organize content for your drive — turning your ideas into income-ready files effortlessly."
          />
          <FeatureCard
            icon={loader3}
            title="SHARE & EARN ANYWHERE"
            description="Every file gets a public link you can share on socials. When someone pays to access it, you earn — no gatekeeping, no platforms needed."
          />
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="w-full max-w-3xl mx-auto px-4 py-16 relative">
        <h2 className="heading-text-2 text-6xl font-anton text-center mb-12">
          FAQ
        </h2>
        <div className="space-y-4">
          {accordionData.map((item, index) => (
            <Accordion
              key={index}
              title={item.title}
              content={item.content}
              isOpen={openAccordion === index}
              onClick={() => setOpenAccordion(openAccordion === index ? null : index)}
            />
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full bg-primary border-y-2 border-black py-12 flex flex-col items-center justify-center">
        <div className="w-[80%] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { number: "100+", label: "CREATORS EARNING" },
              { number: "$18k+", label: "PAID VIA X402" },
              { number: "12K+", label: "FILES MONETIZED" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <h3 className="font-anton text-6xl mb-2">{stat.number}</h3>
                <p className="font-freeman text-xl">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <button className='bg-white border-2 mt-10 border-black button-primary transition-all duration-100 mx-auto font-anton text-2xl px-4 py-2'><Link href="/roadmap">Our Road Map</Link></button>
      </section>

      {/* New Interactive Process Section */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side: Process Steps */}
          <div className="space-y-12">
            <h2 className="heading-text-2 text-6xl font-anton mb-12">
              HOW IT<br />WORKS
            </h2>
            <div className="space-y-8">
              <ProcessStep 
                number="01"
                title="CREATE YOUR ACCOUNT"
                description="Sign up in seconds — no wallet setup or crypto knowledge needed. We handle it all behind the scenes."
              />
              <ProcessStep 
                number="02"
                title="UPLOAD OR GENERATE FILES"
                description="Upload your digital files, or let our AI agent help you create content that's ready to sell."
              />
              <ProcessStep 
                number="03"
                title="SET YOUR PRICE"
                description="Choose if you want to monetize your uploaded or generated content - powered by x402 microtransactions."
              />
              <ProcessStep 
                number="04"
                title="SHARE & START EARNING"
                description="Share your product links anywhere. People can pay instantly to access your files — even AI agents on the open web."
              />
            </div>
          </div>

          {/* Right Side: Interactive Card with Marquee */}
          <div className="relative">
            <div className="sticky top-8 space-y-4">
              <MarqueeText />
              
              <div className="bg-amber-100 border-2 border-black brutal-shadow-left p-8 transform hover:rotate-1 transition-transform">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-anton text-3xl">CREATOR SPOTLIGHT</h3>
                  <Image src={loader2} alt="icon" className="w-8 h-8 slow-spin" />
                </div>
                
                {/* Success Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { label: "Avg. Earnings", value: "$5.2K" },
                    { label: "Curated by AIs", value: "850+ Picks" },
                    { label: "Files Sold", value: "1.2K" },
                    { label: "Creator Rating", value: "4.8★" }
                  ].map((metric, index) => (
                    <div key={index} className="bg-white border-2 border-black p-3 brutal-shadow-center hover:translate-y-1 transition-transform">
                      <p className="font-freeman text-xs">{metric.label}</p>
                      <p className="font-anton text-xl">{metric.value}</p>
                    </div>
                  ))}
                </div>

                {/* Featured Products Preview */}
                <div className="space-y-3">
                  {[
                    {
                      name: "Midjourney Prompt Pack",
                      price: 82.01
                    },
                    {
                      name: "Hook Generator Templates",
                      price: 35.38
                    },
                    {
                      name: "Editable Poster Collection",
                      price: 53.52
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white border-2 border-black brutal-shadow-center hover:translate-x-1 hover:translate-y-1 transition-transform">
                      <div className="w-10 h-10 bg-primary border-2 border-black flex items-center justify-center">
                        <Image src={(index==0)?loader1:index==1?loader2:loader3} alt="product" className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-freeman text-sm">{item.name}</p>
                        <p className="font-anton text-lg">${item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Testimonial Section */}
      <section className="w-full bg-amber-100 border-y-2 border-black py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="heading-text-2 text-6xl font-anton text-center mb-12">
            CREATOR STORIES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Aanya R.", role: "3D Artist", quote: "Finally sold my Blender models without touching a marketplace. Just dropped the link." },
              { name: "Sarah M.", role: "AI Prompt Engineer", quote: "Made $8K sharing my prompt packs — no ads, no funnels, just file drops." },
              { name: "Nina D.", role: "Design Curator", quote: "I don&apos;t even make stuff — I collect and resell! Earning off discovery is wild." }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white border-2 border-black p-6 brutal-shadow-left hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary border-2 border-black rounded-full flex items-center justify-center">
                    <span className="font-anton text-xl">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-anton text-xl">{testimonial.name}</h3>
                    <p className="font-freeman text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="font-freeman text-lg">&ldquo;{testimonial.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="heading-text-2 text-6xl font-anton mb-6">
          START SELLING TODAY
        </h2>
        <p className="font-freeman text-xl mb-8">
          Join thousands of creators who are earning a living doing what they love.
        </p>
        <AuthButton />
      </section>

      {/* Decorative Elements */}
      <Image src={loader1} alt="decoration" className="absolute top-[600px] right-8 w-16 h-16 slow-spin" />
      <Image src={loader2} alt="decoration" className="absolute top-[800px] left-8 w-16 h-16 slow-spin" />
      <Image src={loader3} alt="decoration" className="absolute top-[1200px] right-12 w-16 h-16 slow-spin" />
    </div>
  )
}

export default Test