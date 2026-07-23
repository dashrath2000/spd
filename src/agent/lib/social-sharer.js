export function generateSocialPosts(article) {
  console.log('📱 Generating social media posts for distribution...');

  const url = `https://www.spdrenovation.in/${article.slug}.html`;

  const facebook = `
🏠 Planning a home renovation in ${article.category}?
Check out our latest complete 2026 guide: "${article.title}"

Inside this guide:
• Step-by-step per sq. ft. cost breakdowns
• Essential Society NOC guidelines for Thane & Mumbai
• Polymer waterproofing & modular kitchen layouts

Read full guide: ${url}

#HomeRenovation #Thane #Mumbai #InteriorDesign #SPDRenovation
`;

  const linkedin = `
Modernizing residential & commercial spaces in Mumbai Metropolitan Region requires clear budgeting and material standards.

SPD Renovation has published our latest technical renovation guide:
"${article.title}"

Key Insights:
1. Civil vs Modular renovation cost matrices (2026 rates)
2. Housing Society NOC & structural permission compliance
3. 10-Year Polymer Waterproofing process

Read the complete report: ${url}

#CivilEngineering #InteriorDesign #ConstructionManagement #SPDRenovation
`;

  const twitter = `
🔨 NEW RENOVATION GUIDE: "${article.title}"

Looking for costs, society NOC tips & modular design trends in Thane/Mumbai?

Read here: ${url}

#Thane #Mumbai #RenovationTips #InteriorDesign
`;

  console.log('✅ Social posts generated for Facebook, LinkedIn, and Twitter/X');

  return { facebook, linkedin, twitter };
}
