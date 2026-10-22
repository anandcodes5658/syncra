import axios from 'axios';
import { config } from '../config/env.js';

export interface PlatformCaptions {
  instagram: {
    caption: string;
    hashtags: string[];
  };
  facebook: {
    caption: string;
  };
  linkedin: {
    commentary: string;
    hashtags: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
    privacy: 'public' | 'unlisted' | 'private';
  };
  twitter: {
    text: string;
    hashtags: string[];
  };
}

export class AIService {
  static async generatePlatformCaptions(masterCaption: string, tone = 'professional & engaging'): Promise<PlatformCaptions> {
    // If Gemini API Key or OpenAI API Key provided, can call external API
    if (config.ai.geminiApiKey) {
      try {
        const geminiResult = await this.callGemini(masterCaption, tone);
        if (geminiResult) return geminiResult;
      } catch (err) {
        console.warn('Gemini API call failed, falling back to smart local engine:', err);
      }
    }

    // High quality local adaptation engine
    return this.smartRuleBasedGeneration(masterCaption);
  }

  private static smartRuleBasedGeneration(master: string): PlatformCaptions {
    const cleanMaster = master.trim();
    const firstLine = cleanMaster.split('\n')[0].replace(/[#*_]/g, '').trim();
    const coreTitle = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine || 'Syncra Platform Update';

    // Extract potential keywords for tags
    const words = cleanMaster
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'your', 'about'].includes(w));
    
    const uniqueKeywords = Array.from(new Set(words)).slice(0, 6);
    const generatedHashtags = uniqueKeywords.map(w => `#${w}`);
    if (!generatedHashtags.includes('#Syncra')) generatedHashtags.push('#Syncra');
    if (!generatedHashtags.includes('#Innovation')) generatedHashtags.push('#Innovation');

    return {
      instagram: {
        caption: `${cleanMaster}\n\n✨ Tap the link in bio to learn more!\n\n${generatedHashtags.slice(0, 7).join(' ')}`,
        hashtags: generatedHashtags.slice(0, 7)
      },
      facebook: {
        caption: `${cleanMaster}\n\nWhat are your thoughts on this? Let us know in the comments below! 👇`
      },
      linkedin: {
        commentary: `${cleanMaster}\n\nKey Takeaways:\n• Executing with speed and clarity\n• Building scalable, resilient systems\n• Delivering seamless creator workflows\n\nHow is your team approaching this in 2026?\n\n${generatedHashtags.slice(0, 3).join(' ')}`,
        hashtags: generatedHashtags.slice(0, 3)
      },
      youtube: {
        title: coreTitle,
        description: `${cleanMaster}\n\n⏱️ Chapters:\n0:00 - Introduction & Overview\n0:45 - Key Highlights\n1:30 - Deep Dive & Next Steps\n\n🔔 Subscribe to Syncra for more updates!\nWebsite: https://syncra.io`,
        tags: [...uniqueKeywords, 'Syncra', 'Tutorial', 'Tech', 'Workflow'],
        privacy: 'public'
      },
      twitter: {
        text: cleanMaster.length > 220
          ? `${cleanMaster.substring(0, 215)}... ${generatedHashtags.slice(0, 2).join(' ')}`
          : `${cleanMaster} ${generatedHashtags.slice(0, 2).join(' ')}`,
        hashtags: generatedHashtags.slice(0, 2)
      }
    };
  }

  private static async callGemini(masterCaption: string, tone: string): Promise<PlatformCaptions | null> {
    const prompt = `Adapt the following master caption into platform-specific copy for Instagram, Facebook, LinkedIn, YouTube, and Twitter (X) with a ${tone} tone. Keep Twitter text strictly under 280 characters. Return ONLY a valid JSON object matching this schema:
    {
      "instagram": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
      "facebook": { "caption": "..." },
      "linkedin": { "commentary": "...", "hashtags": ["#tag1"] },
      "youtube": { "title": "...", "description": "...", "tags": ["tag1", "tag2"], "privacy": "public" },
      "twitter": { "text": "...", "hashtags": ["#tag1", "#tag2"] }
    }
    
    Master Caption:
    ${masterCaption}`;

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.geminiApiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    }
    return null;
  }
}
