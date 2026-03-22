# Feb 11, 02:29 PM

**Meeting Date:** 11th Feb, 2026 - 2:29 PM

---

**Speaker 1** *[00:24]*: Hey. 
**Speaker 2** *[00:24]*: Hi. How's it going? 
**Speaker 1** *[00:25]*: Good, how are you? 
**Speaker 2** *[00:25]*: Good. Here for Alicia. Okay. Me just a moment. All right. You could probably just go ahead and. 
**Speaker 1** *[00:30]*: Have a seat in the comments. All right, There's. It. Hey. Hey. 
**Speaker 2** *[04:28]*: What's going on? 
**Speaker 1** *[04:34]*: Back into classes. 
**Speaker 2** *[04:37]*: January 20th, I believe I'm so removed. 
**Speaker 1** *[04:40]*: From that life though. 
**Speaker 2** *[04:42]*: Yeah, hang out. It's nice. I only have classes Tuesday, Thursday this semester. 
**Speaker 1** *[04:56]*: Oh, okay. 
**Speaker 2** *[04:57]*: So I'm off Monday, Wednesday, Friday. 
**Speaker 1** *[04:59]*: So I got a little some time on your hands. 
**Speaker 2** *[05:01]*: Exactly, exactly. 
**Speaker 1** *[05:04]*: All righty. So today want to focus on website. Let's do it and talk about all that and just making sure that it's good alignment on both sides. 
**Speaker 2** *[05:13]*: Absolutely. 
**Speaker 1** *[05:17]*: And that is like our main focus right now. I know they were very excited about. 
**Speaker 2** *[05:22]*: Yeah. 
**Speaker 1** *[05:22]*: With us opening a new location. 
**Speaker 2** *[05:24]*: Oh, really? 
**Speaker 1** *[05:25]*: Yes. We have a right of location now. So a lot of things need to happen on the back end for that new location for Google purposes and everything. So that's like main picture here. So with that, I kind of wanted to talk about things on the website because our website now is craft and we're trying to just avoid that in general. So my first question is kind of the framework of this AI build out. 
**Speaker 2** *[05:54]*: Right. 
**Speaker 1** *[05:56]*: Is it kind of like a code that builds the whole framework or are you able to do kind of more of a hybrid style where it's code in specific areas of the website? 
**Speaker 2** *[06:14]*: Yeah, sure. So the website in itself is HTML code. Right. So that's what's built on the website. But then I also have a content management system on the back end where you can go in and manage blogs, you can manage any other pieces that you update constantly without actually getting to the nitty gritty code and manually doing yourself or asking an AI agent to do it for you. So that's kind of separation between those two. 
**Speaker 1** *[06:37]*: So what is that platform though? 
**Speaker 2** *[06:38]*: It's called Sanity. 
**Speaker 1** *[06:40]*: Sanity. 
**Speaker 2** *[06:40]*: Sanity, yeah. So you guys get full access to it. Like I said, you can publish blog posts. I check your website. You guys don't really do the blogs, do you? No. Okay. So I mean, I could do the blogs as well or if you guys like to write them yourself. Or you could just ask Claude or ChatGPT to write it for you. Then you can upload directly to Sandy and then that automatically updates the current website. Okay. 
**Speaker 1** *[07:06]*: And is it still hosted through your WordPress or. 
**Speaker 2** *[07:09]*: It's been hosted through Vercel. So WordPress is. It's pretty old. It's kind of really outdated, especially for the new landscape of how people browse the Web. Today I use a framework, it's called Astro. It's loading speeds are like less than like half a second. That's just what it's built off of. So we're going to move you guys entirely over from WordPress over to Astro. And Vercel is where I host it. It's the Go to hosting platform right now. And it takes like two seconds to hook up your domain name, bring it over. 
**Speaker 1** *[07:42]*: Yeah, full autonomy is like one of our main things because like right now I can get on WordPress and if I need to create a landing page or if I need to duplicate something or change an H1 heading or whatever, I can get on there to do that. So that's one of our biggest things, is making sure that I am still able to have that access and I don't have to go to you every single time and be like, hey, I need this change. Can you change the setting? Can you change this photo? Can you change this? Blah, blah. I really need to have that. 
**Speaker 2** *[08:18]*: I can also give you just access to a chatbot so I can hook up Claude, which is the Go to AI model right now, to the website. And then you can just text in plain English, hey, can you change this landing page? Hey, can you make me a landing page based off this one? Right? Can you NBA new location page based off this new location we opened? You can kind of go in yourself and add it once the website's actually up and running, and then push the code from there or first review it, make sure it's exactly what you want. If something's missing, let's say you're missing a button or something, you can say, hey, yeah, this button, add a call to action. Can you point it to XYZ page or to this link or whatever? 
**Speaker 2** *[08:53]*: And so you have full autonomy just by speaking plain English. 
**Speaker 1** *[08:57]*: Okay. Because that's what I do now is like I can use chat. Hey, create the code that I need for this box. I want it to have an H1 heading. This is the, you know, text below that. And it can create it. And so I like when the framework is not, you know, let's just say like something breaks. It's not the entire page. It's just maybe a section, right? So kind of more of the grid style. So is that still the same framework or is it one code kind of builds out the page? 
**Speaker 2** *[09:33]*: It's all in the same project, so think about it as a project. So we have all these styles of the website, what kind of colors, what kind of fonts, all that stuff is already baked into the system prompt of the AI, so it already understands that it gets baked into all the prompts that you would send it yourself. So it would understand the current layout of the website that's already happening. And then all you gotta do is just basically say it and it'll be the same format, same style, everything of what the website. 
**Speaker 1** *[09:55]*: What I'm saying is if something breaks. 
**Speaker 2** *[09:57]*: Yeah. 
**Speaker 1** *[09:58]*: Is the whole page, like, is it just going to affect the code in an area or is it the whole framework? 
**Speaker 2** *[10:04]*: Just the area. So say like a button breaks, for example, it doesn't affect the whole landing page. The landing page will still be there. It's just if someone clicks that button, it just won't work because that button's broken. 
**Speaker 1** *[10:12]*: Okay, so which brings me into how. How are you automating making sure that there isn't broken links that we don't have missing pages? 404 errors. Like, what is the system that checks that and notifies and how does that work? 
**Speaker 2** *[10:26]*: Yeah, so I use a browser automation, which basically it's called Playwright, not to get into any technical details, but it's a browser automation that can go on the website, go through every single page, click through everything as if a human was clicking through it, make sure all the buttons work, make sure all the backlinks work, make sure everything's SEO optimized, and just go through the whole process without me. Have to manually do it. Obviously, I'm still going to go to the website and, like play with it and make sure it works right from my side. But that automation will automatically run as soon as a new update is pushed to the website. 
**Speaker 2** *[10:57]*: Then that playwright, it's called the Playwright mcp, gets pushed, and then that automation can automatically go play around the website, see exactly what's working, do a full audit, and then go back to Claude and make sure everything's working properly. 
**Speaker 1** *[11:14]*: All right, so kind of not using WordPress. My concern about that is just the amount of widgets that are available for WordPress. So how do you combat that? 
**Speaker 2** *[11:24]*: Yeah, so I just actually worked with a financial planning company and they were in the same situation as you guys. They're on WordPress. They have these widgets like Squiggly, they're calculators, forms, I mean, like everything. Yeah, you can actually transfer over into code. And once you have that code, we're good to go. We can build out that code, we can adjust it using cloud code. So you already have that data inside of WordPress. It's just a matter of exporting it out of WordPress. 
**Speaker 1** *[11:49]*: But what about things that automatically update, such as Google Reviews and Pin Parrot, our map system? 
**Speaker 2** *[11:56]*: Where's that pulled from Google? 
**Speaker 1** *[11:57]*: Google One's going to be pulled from Google. Pin Parrot is its own widget. So I mean, that would essentially just be code. 
**Speaker 2** *[12:04]*: That's right, the Google. Yeah, it's hooked up to your Google My business, right? Yeah. Automatically pull from it. That's no problem at all. 
**Speaker 1** *[12:12]*: Okay. I'm just. I'm trying to understand, like, how that will work. Because, like right now with the plugin, you know, it's like the Google Review plugin. 
**Speaker 2** *[12:24]*: Yeah. 
**Speaker 1** *[12:24]*: I can choose. Okay, show four reviews. No, just show two reviews at a time. Make it smaller, scroll, make it go this way. You know what I'm saying? So it's like, how would that look? I mean, it's actual code that has to be built out. And then how does it update continuously? 
**Speaker 2** *[12:41]*: The Google Reviews are live data. So I'm guessing right now, if you're pulling from your Google Live business, it would be the same process just built into Python scripts, which manually go out. Not manually. Automatically go out onto the Internet and find your Google reviews and update them every week or so or every two weeks. Whatever you guys do that can be built out, no problem. And then as far as like displaying your reviews, then that's just a choice up to you guys. You want to display all four reviews. You want to have a review page on your website, it's really up to you. But the data will be there because it'd be pulled, it'd be fetched automatically from Google My business with those reviews. 
**Speaker 1** *[13:16]*: Okay. And then so I have like this kind of framework that we're looking. 
**Speaker 2** *[13:26]*: Backup protocol backup. Everything will get backed up to a GitHub repository, which is basically a code base. So in case anything gets blows up or something goes really wrong, we have that code saved in the backend. 
**Speaker 1** *[13:41]*: And how often is that? 
**Speaker 2** *[13:42]*: Every time a new update's pushed, it's updated. 
**Speaker 1** *[13:46]*: So only upon updates. 
**Speaker 2** *[13:49]*: Yeah. 
**Speaker 1** *[14:00]*: ADA compliance. 
**Speaker 2** *[14:04]*: Is that just the roofing? 
**Speaker 1** *[14:06]*: No. So that's like visually impaired, typically. Like, it's has a lot to do with like alt text, but then also like just say you have like a gravity form in there. It has to do with them being able to navigate your website without kind of being able to see it. So it's like, okay, handicap, but for a website. 
**Speaker 2** *[14:25]*: Gotcha. I do some more research, but I'm sure it's very capable of doing that. 
**Speaker 1** *[14:37]*: All right. Lazy loading, especially for mobile. Just. 
**Speaker 2** *[14:43]*: Yeah. That's all. Optimize an SEO. 
**Speaker 1** *[14:53]*: And then say I want to go in and make some changes or we're discussing changes. Is it done on a staging site or local environment for updates? 
**Speaker 2** *[15:02]*: Staging site. Yeah, it's all. 
**Speaker 1** *[15:10]*: Videos. Are we self hosting or are they being hosted on like YouTube? 
**Speaker 2** *[15:15]*: Self host. 
**Speaker 1** *[15:16]*: Self host. 
**Speaker 2** *[15:16]*: Yeah, we baked into the code. 
**Speaker 1** *[15:29]*: Breadcrumbs. 
**Speaker 2** *[15:30]*: Yeah, we add breadcrumbs. Any way to make navigation more seamless. 
**Speaker 1** *[15:36]*: Well, and we want to like our biggest thing and our biggest concern is staying compliant with Google because we cannot lose another ads account. A, that really wasn't our fault, but anyways, we had to start over at that point just because we lost the trust. And B, we want to speak Google. 
**Speaker 2** *[15:55]*: Yes. 
**Speaker 1** *[15:56]*: Like SEO and we love AI. But like even the more recent research I do on that, they're like, we can't, like, we can't lose the humanization of it because Google is going to. It hurts you as far as the quality scores and stuff like that. 
**Speaker 2** *[16:12]*: Okay. 
**Speaker 1** *[16:13]*: This entire website is AI. 
**Speaker 2** *[16:15]*: Yeah, it won't look like that. I actually did a full audit of your current website, so I crawled the entire thing. All your pages. Yeah. So you could cover all of that kind of that SEO compliance stuff. The robots like txt, making sure your site maps are all hooked up, all that stuff. And it won't lose any of the current SEO value already have because redirect links will be baked into the new website. 
**Speaker 1** *[16:40]*: So redirects. That was actually literally my next question. So are they automatically just a redirect to like maybe set up like just our homepage that they would be sent to? If there's like anything broken or something, say they click on a button. 
**Speaker 2** *[16:55]*: So every link you have in your current website right now will be linked to the new page, quote, unquote, the new website. Any new pages will be bailed out. Any new service page notification pages will just be your own page since you don't have an existing page on your old website. 
**Speaker 1** *[17:17]*: What will we use forms? 
**Speaker 2** *[17:19]*: Forms. So it would just be so the kind of picture like the intake form or what do you. What do you do now? 
**Speaker 1** *[17:25]*: We use Gravity Forms. 
**Speaker 2** *[17:26]*: Gravity Forms? 
**Speaker 1** *[17:26]*: Yeah. 
**Speaker 2** *[17:27]*: Is that a third party? 
**Speaker 1** *[17:28]*: It's a plugin. 
**Speaker 2** *[17:29]*: A plugin. Okay. So what I could do, where do you get the data sent to? 
**Speaker 1** *[17:35]*: So it holds it within gravity. We also have access to it on WordPress, of course. And then it emails it to us. 
**Speaker 2** *[17:42]*: Yep. 
**Speaker 1** *[17:46]*: It would, it wouldn't hurt us if we did an API key and it went directly to our CRM. 
**Speaker 2** *[17:52]*: That's what I was thinking. It did fail. I'm not sure. I've never heard of Gravity. 
**Speaker 1** *[17:55]*: The thing I like about Gravity is user friendly. I can go in there and make a new form if we have a home show and I just need one for the giveaway that we're doing or $1,500 off a full roof replacement or whatever it may be. 
**Speaker 2** *[18:10]*: Oh, I agree. 
**Speaker 1** *[18:12]*: And I can like duplicate them really easily. But then it categorizes them for us. 
**Speaker 2** *[18:17]*: Right. 
**Speaker 1** *[18:17]*: And we want to be very specific with where people hit forms and we want to know where and why. Right. So we'll get into also like GClids and stuff like that. But basically if they did a homepage, I want to know that action. 
**Speaker 2** *[18:32]*: Happened on the home page. 
**Speaker 1** *[18:33]*: If they did it on our service page, if they did it on a referral page, it made needs to be a specific referral form source. Yeah. And then I'll also get into a little bit more of this in the framework. But if they landed on a Roanoke page because they came from a Roanoke ad, I want to know that they filled out a Roanoke form on the Roanoke page. So it's got to be tagged appropriately. I don't just want one main form and everything gets funneled through it because it doesn't. 
**Speaker 2** *[19:00]*: You don't know. 
**Speaker 1** *[19:02]*: Exactly. 
**Speaker 2** *[19:02]*: So does Gravity have that? Do you like how Gravity does it right now? 
**Speaker 1** *[19:07]*: Yeah. 
**Speaker 2** *[19:07]*: Okay, so two options here. One, if Gravity has an API key. Sweet. We just run with that and it can basically do the same thing that your widget does. But API key, if it doesn't, I can just build you out a new system that does exactly that. So it sources where the page is coming from and kind of tags it inside of maybe like Google Sheet or whatever. Your CRM is really the little bit in the CRM and basically get any kind of information that you want. So the time of day they submit their information, what kind of form it was on, what page it was on. Any kind of information that we can extract from that process, I can get. 
**Speaker 1** *[19:44]*: And then with that we have an issue currently with and we pinned it down to organic traffic because it wasn't Google issue. And we feel like we got maybe essentially spam botted by someone probably competition out there, whatever, spending a lot of our money essentially on Google. But now that we've cut that out completely, we have a honey pot and we use Rakasha. I think we talked about this briefly, but what is going to be the process to stop spam getting through essentially on our forms because it's just. It's more work for someone to have to go, okay, this looks like a real person. They use real names. Sometimes they use real numbers. Sometimes we have to call people and they're like, that's not me. You know, blah, blah, blah. 
**Speaker 1** *[20:32]*: So what are some parameters that we can kind of work in that coding or if we do so we can use like plugins like gravity. If it's already an existing platform and we use it and pay for it, we can use that or so. 
**Speaker 2** *[20:46]*: So think of like a widget in WordPress, the same API in this new website. So it's very interchangeable. It's the same thing. Basically the same data is being sent. It's just two different forms. 
**Speaker 1** *[20:55]*: But it wouldn't be Gravity. 
**Speaker 2** *[20:56]*: It wouldn't be Gravity. 
**Speaker 1** *[20:57]*: We can't use this for this. 
**Speaker 2** *[21:00]*: Recaptcha. Or for this. 
**Speaker 1** *[21:02]*: For forms in general. 
**Speaker 2** *[21:02]*: For forms in general. So to collect information, we could use Gravity, like you said, but to make sure it's actually a real person, we could do the honeypots, as you were saying. Recaptcha. We're also just kind of have an AI filter in the middle that kind of examines if it's a real person or not. So you probably need a little bit of training data. But it's very possible because I get a million inquiries from a couple clients of mine that I run a website for of just pure bots. And usually they have pretty clear giveaways that it is a bot. Even sometimes it's a commercial security company. Sometimes they don't put in. If they're looking for video surveillance or whatever, they're. They no name, they have no phone number. Right, but like you said, unfortunately, yeah. 
**Speaker 1** *[21:46]*: Whoever is targeting us has. The ones that were coming from Google were super clear that they were bots. It wouldn't even be names. It would just be like a bunch of letters, numbers, blah, blah, blah. 
**Speaker 2** *[21:56]*: Right. 
**Speaker 1** *[21:57]*: Clear as day. 
**Speaker 2** *[21:57]*: Yeah. 
**Speaker 1** *[21:58]*: But then whatever is happening organically right now, we still can't figure out where they're coming from, how they're getting to our site and why. And they're still submitting forms. And even with recaptcha. Recaptcha we have on right now, and we have the honey pot. It's not stopping them from submitting, it's just flagging it, telling us this is probably spam. Yeah, but they've gotten. It's. Whatever it is pretty good. It'll be like a real name, full, like first, last name. Number, email, and then it will say, need help with my roof? Or something like, it's pretty. Could be a real person. 
**Speaker 2** *[22:35]*: What I might do is add in another field that says, like, town. Because spam don't know what kind of locations. They're not scraping your entire website to see what locations you're doing, because they're doing this for probably thousands upon thousands of different companies. So having a town indicator, so you say Blacksburg, Christiansburg, whatever, that would be a good way to filter that spam through instead of just having it just be name, email, phone number. Because, I mean, they could put any information in it. It'll look real. 
**Speaker 1** *[23:04]*: Okay, I like that. And gravity has recaptcha built in and a honeypot. So that's what I was saying. If we're able to use gravity, then, you know, that kind of already, like, fixed the problem, fixes it a little bit. Yeah, but if not, I was just trying to understand, like, how that, how all this works. It's all kind of really new to me. When you say no WordPress, I'm like, All right, how will the AI code handle? Cumulative. Oh, my gosh, I can't say this. Like cls, cumulative layout shifts, like, especially on mobile browsing. 
**Speaker 2** *[23:43]*: Yeah. It's so creating separate versions for desktop, mobile, iPad, like all the kind of platforms people view your website on. So it'd be optimized for all three of those. 
**Speaker 1** *[23:53]*: Okay. Because obviously with landing pages that will play into, like, our Google quality scores. So will the hard, like, will the dimensional aspect be hard coded? Because that's what that comes into variable. 
**Speaker 2** *[24:11]*: So say like your logo, for example. We don't want the same size on desktop versus mobile. 
**Speaker 1** *[24:15]*: No, no, no. Okay, so this is like, this comes down to, like, speed. Right. So let's say we have a HERO at the top and it's on mobile. We probably do, you know, a still image, but let's just say it's a video. It's not quite loaded yet. Will things shift until that loads? That's where the like, CLS comes into play. It's like if certain things are not loaded yet, it may compress or move things, and then when they load, it's going to put them back in their place where they should be. 
**Speaker 2** *[24:47]*: No, everything will just load normally and then the video can just load itself. Basically, it's Nothing's being moved around because the video is not loading. 
**Speaker 1** *[24:55]*: Okay. Soft 404s, which I didn't even know this was a thing. 
**Speaker 2** *[25:14]*: So those are just redirects or failed Redirects. So say there's a. Say someone clicks a link on your old website, but the new website's already up, But I haven't optimized any redirects there. Then it'll just go to 404 page error, which we won't. Want. Which we don't want. So that's why I was talking about the redirects earlier, which I get that. 
**Speaker 1** *[25:32]*: But that's if people are landing on our old website. This is like a soft 404 IS. So it still says like, content not found, but it tells Google that content is there. And so that's like another red flag. I know what you're saying is like, the new website's not going to be perfect. Right? That's in a perfect world. 
**Speaker 2** *[25:50]*: Yeah. 
**Speaker 1** *[25:51]*: But if they're. I don't know. I don't know how to say that. Like, worst case scenario, if something breaks. How is that? 
**Speaker 2** *[26:02]*: If something breaks, the backups will just redirect them to the hero page, the home page. 
**Speaker 1** *[26:07]*: That's what I was saying earlier. 
**Speaker 2** *[26:08]*: That's like worse. Worse. 
**Speaker 1** *[26:09]*: Something breaks, there's a redirect. 
**Speaker 2** *[26:11]*: Yep. 
**Speaker 1** *[26:12]*: All right. Yeah. Because I didn't know a soft 404 was a thing. But basically it's content not found, but tells Google I'm working fine. And so it is essentially a red flag to Google, of course. And then we talked briefly about like GCLID IDs and ECLID, because we run ads both on Google and Facebook, of course, and they land on our pages. So how would that information be tracked? Would it have to be an API, Maybe a pixel? 
**Speaker 2** *[26:52]*: Pixel from you talking about meta? Well, we meta, but Google track that through the analytics. Meta would be separate. You just got to put a pixel. 
**Speaker 1** *[27:03]*: We have pixels on our site now, but my understanding is they're different than GClids and FClids. So a G clid will follow them through the site, essentially. But we want to collect that when they submit. So that way on the back end, the reporting is going back to Google. 
**Speaker 2** *[27:21]*: And we know kind of the journey they took. 
**Speaker 1** *[27:25]*: Yeah, yeah. So for instance, the guy that I work with on our Google Ads, he had a developer build out, essentially, it collects all the G clids and F clids from the day and matches them up with their CRM data to, like, keep the person and their G clid together. And then it reports it back every single day. Because even though you have a pixel on the website, it doesn't follow it to the whole journey to your CRM. So it doesn't know, did you sell this job? Did you not sell this job? So it's more so back end than did we just get the lead? Because yeah, our pixel and everything will report that back. Okay, they submitted a form, so it was successful. 
**Speaker 1** *[28:15]*: But more so than that, he created something that follows them through the journey of the CRM and once they become essentially like a customer or closed, that G clid goes back and it gives Google the information like, hey, we sold this job and it was a $10,000 job. So then it helps you on Google side with. Because an ad can look really successful because you're getting forms, but if those forms don't turn into actual customers is not successful. 
**Speaker 2** *[28:47]*: Right. 
**Speaker 1** *[28:47]*: And sometimes ones you think that are performing really well are converting for. Like in our case, maybe this one ad is really good, but we're getting repairs out of it. So they're actually low ticket value. Whereas this other one in Google's eyes looks like it's not performing well. Maybe we're paying a lot more per form or whatever. But then those ones that we do get from it, we're closing out $10,000 versus $1,500 repairs. It takes that information from their G clid from them, from the customer journey and then reports it back. And I know he had it like developed with using an API key. Basically every day it would take the data from the G clids that were collected in the CRM data and match them up and. And then kind of report back. So I don't know. That's kind of big picture. 
**Speaker 2** *[29:41]*: Yeah. 
**Speaker 1** *[29:42]*: Not maybe necessarily right off the rip, but if we can find a way to keep those G clids and F clids and then merge them with data that's in CRM and then report back. 
**Speaker 2** *[29:55]*: Yeah, it's like big picture. Right. I understand what you're saying. Yeah, I can't give you. 
**Speaker 1** *[29:59]*: I'll give more information because I know I'm not explaining that well. 
**Speaker 2** *[30:04]*: We can definitely find a way to do that for sure. I don't know the exact process, but we could definitely find a solution for that for sure. 
**Speaker 1** *[30:11]*: And it may be that if we do get away from gravity and say we build out our own form, that it puts that G clip instantly with that customer and then it will automatically go in the CRM. So that way we always have that data and then it's just as simple. As simple as exporting the sold jobs from the CRM that already have the gclids or fclids attached to them because they came through the form. We don't have to match up data. 
**Speaker 2** *[30:38]*: Exactly. Yeah. 
**Speaker 1** *[30:39]*: So maybe that's. 
**Speaker 2** *[30:40]*: There could be an automated process there. Yeah, we'll start it for now. 
**Speaker 1** *[30:44]*: All right. 
**Speaker 2** *[30:56]*: Okay. 
**Speaker 1** *[30:56]*: So now a lot of my questions kind of go. They play into the framework. So I'll kind of explain what we're looking for, big picture. And then some parts that I am concerned about and how we can like kind of combat them for Google's purposes. Because again, we gotta speak Google's language. So we want to have basically like our main domain would obviously be modernday roof.com. That's not changing. We want this to be kind of like hq, our headquarters. Because when we are serving our ads, we do like dynamic insertion. And if people do not have like IPs or whatever, Google can't see where they're searching from, they're not logged in, whatever the case may be. They're served more generic ads. 
**Speaker 1** *[31:38]*: So if the dynamic insertion doesn't work, it defaults to kind of more like Southwest Virginia or larger location versus if it's dynamic and they search in Christiansburg, it should say Christiansburg Roofing Company. You know. 
**Speaker 2** *[31:50]*: Right. 
**Speaker 1** *[31:51]*: So we want to have basically our main website that will serve its purpose where if we can't determine where someone's searching from, they're going to land on said website and it's just going to be a broad area. Then we want to have two pages that mirror and they're not just landing pages. They're going to look just like our main website, but they're going to have images that are specific to an area and headlines that are specific. So it's going to say Premier Roofing Company. And then it'll have like a picture of the store. You know what I'm saying? 
**Speaker 2** *[32:27]*: Yeah, it's keyword optimized to that specific location. 
**Speaker 1** *[32:29]*: Yes, but so we want to do it like. And this is just kind of like examples, but like forward slash burnt roofing, forward slash Neuro Rally roofing. And then so going back to like the whole Google side of it. If they're landing on ads that are very specific to those areas, we want to make sure that they're. Then the customer journey is then landing on the correct page. So that way they look like, or we look like necessarily like we are the roofing authority in that area. Because right now, you know, we're serving ads and actually our top impressions are in Rubik. So, you know, but then they're landing on a page that's like, you know, Christiansburg, you know, they see all the things and it doesn't feel tailored to that area. 
**Speaker 1** *[33:10]*: So then they're like, oh well let me go look for a roofer, maybe closer to me. So we want it to feel like if they search in Roanoke, Benton, Salem, you know that area, they're going to hit this page. If it's more newer, valley side, they're going to hit this page. It's going to feel more hometown. Like the other thing that I've been researching is these two pages can in Google's eyes get authority pretty quickly when done correctly because they're going to pull from the headquarter page kind of like when you have a national company but then they have hundreds of localized pages. So like BCR is a national roofing company. So of course I go and look at their website, they have their local ones but then I can get back to their national one and see, you know, the differences. 
**Speaker 1** *[33:59]*: But from what I understand, in Google's eyes, when done correctly and not 100% mirrored, they can get the same authority that your main page had. And then of course help out with location specific SEO. Because I know the flip side of that and I didn't realize this until kind of digging into this a little bit more. It's like our Google Ads person keeps telling me we need location pages for every single location. But sometimes if your landing page is not truly done right, it will actually hurt your quality score as far as Google goes. Because they're like oh well, they're just throwing up hundreds of landing pages for all these areas to look like they are a business in that area really. Right. 
**Speaker 2** *[34:43]*: Which I think is going on right now with your current website. So like I'm on your website, I couldn't find location pages from the landing page or from the homepage. Yeah, you can. Exactly. Like when I looked at modern day roof Christiansburg, they had brought me to the Christiansburg page but it wasn't really connected from that homepage to get to those server get to those location based pages now. 
**Speaker 1** *[35:05]*: So I've heard like I've seen both sides of that where sometimes you don't want your location pages all you want them on the site map and on the backside of it. But you don't necessarily want to have a locations tab that pulls down 50 locations. 
**Speaker 2** *[35:20]*: You want them baked in as backlinks into the content of the website when relevant. So say we're talking about, it's on the homepage talking about all the locations we have, then there's a button that takes you to that location page also in the footer as well. We can list out all those. Just so the sitemap has all that information for it. 
**Speaker 1** *[35:38]*: Yeah. 
**Speaker 2** *[35:39]*: So it's not like. Yeah. 
**Speaker 1** *[35:41]*: So when I studied a lot of other. So I went through and I found. We're with gaf, of course. So I went through and I found all three star roofing contractors, which means they know what the heck they're doing. Right? Right. And I went through all their websites and I looked at footers, I looked at service pages, I looked at all this stuff to try to like, see what we want to create, not, you know, like pulling inspiration. Essentially what I found is a lot of them. You. You don't see their sitemap in their footer, you don't see their locations in their footer. And I wonder, is that more appealing? Austin does not like that our sitemap shows in the footer. But it's always been my understanding that for Google's purposes, you want it visible. 
**Speaker 1** *[36:29]*: But then again, I see why he's like, it doesn't look good because a customer can just scroll to the bottom, click on it, and they see all of your pages, essentially, sometimes pages. And I did go in and like hide some once I realized, like, oh, okay, they can see that. But then those pages are just not active pages anymore. That's why you don't see them on the site map. So that's something that I would lean on you for your expertise in. That is what really should we show in the footer and what should we. 
**Speaker 2** *[36:59]*: Not any relevant information that someone could scroll down and get farther down the rabbit hole, I'd say. So location pages. So Christiansburg, Blacksburg, all those located service pages for sure. So what exact services you offer, like roof repairs, full roof replacements, whatever. And then blog, I'd say like a little blog. It really depends on what kind of pages we have right now. But I do know that we need those footers down there. Even though it's not like aesthetically pleasing, it just makes the user experience a lot easier. And Google loves it as well. 
**Speaker 1** *[37:36]*: But what if we don't want. So let's just say hypothetically we have a Christiansburg page built out, a Radford, Blacksburg, Salem, Roanoke, blah, blah. Before you know it, we have 20 location pages. 
**Speaker 2** *[37:51]*: It would just be the main ones that drive the most traffic. Okay, so V. Blacksburg, Roanoke, all the old, like whatever your top five or maybe top four. 
**Speaker 1** *[37:58]*: Okay. 
**Speaker 2** *[37:59]*: We're often have those. 
**Speaker 1** *[38:00]*: Like, that's a lot going on down there. 
**Speaker 2** *[38:02]*: Right. 
**Speaker 1** *[38:02]*: And some of those things we don't want to show front and center. 
**Speaker 2** *[38:07]*: Yeah. 
**Speaker 1** *[38:07]*: Like a lot of those things we're building out on the back end only for hooping purposes. 
**Speaker 2** *[38:11]*: Yeah. 
**Speaker 1** *[38:11]*: Not for user ability. 
**Speaker 2** *[38:14]*: Essentially it would just be the main hubs really. So if we have like say there's a tiny town that we want to service, we'll have a page for it, but we're not going to actually display it. But maybe if it's mentioned somewhere in the copy. Yeah, we're going to throw a link in. Some people can explain. 
**Speaker 1** *[38:28]*: That's fine. Yeah. Links. Yeah, definitely. So headquarter page, basically then the two Roanoke specific and like NRV specific. And then all of this will be kind of global content that is on all of them. However, we need to make sure that all the verbiage is correctly and that it's not just a exact mirror of it or a copy essentially that there are differences. So that way in Google's eyes because they will. So Google hates duplicate content. So like the mirrored strategy will kind of. You'll get penalized as far as like Google goes. So making sure that the content is not identical on all the pages. However we want them to be similar and you know, kind of built out like that. 
**Speaker 2** *[39:24]*: Yep. 
**Speaker 1** *[39:26]*: So going to kind of the menu and dropdowns and stuff like that. So we do want to. First and foremost it's going to be like a service tab. Once they hover over that or click on it on mobile. We want a like roof replacement, roof repair, maintenance, gutter. But under roof replacement there's four more pages. 
**Speaker 2** *[39:44]*: Okay. 
**Speaker 1** *[39:46]*: Only because we don't want something to land on like a roof replacement page for everything. We'll probably have a roof replacement page. But then under that's going to be like shingle, metal, timber seal, kind of all the different types of roofing. Yep. So that way they're not scrolling for a month to read all the information. So it'll be like roof replacements and then a further breakdown of the types of roofing, roof repair and maintenance. We're fine with keeping that one single page and then a page for gutters. So those will be all the service breakdowns. Next we want to have financing, which also ties into our Google because we have a new campaign around financing. A lot of people obviously are tightening up as far as money goes. So that is a big push on the website all around. 
**Speaker 1** *[40:36]*: So we will have a financing page on the homepage. We want to have like a financing section where they can click on it. It'll take them to the financing Page where there is which we use a widget currently for, like filling out an application. We're going to switch it over right now we're on our website is good leap, but we actually use another financing institution called Hearth. So we'll be switching over to them. So we can use, like, their created widget already and plug that in. 
**Speaker 2** *[41:07]*: Just API? Yep. So do a little research. Yeah, the API and how that kind of works. But yeah, there's API, then we're good to go. 
**Speaker 1** *[41:14]*: Okay. And then we want to have an education hub of some sorts. We can work on that name of whatever we call that. 
**Speaker 2** *[41:22]*: Is that kind of a blog? 
**Speaker 1** *[41:24]*: Essentially a blog. We can have a blog page on there as well, but it is going to be kind of where people go to learn a little bit before we ever even step in the door. Because. Oh, and hotjar. Hotjar can be used. 
**Speaker 2** *[41:39]*: Hotjar, I never heard of that. 
**Speaker 1** *[41:41]*: So hotjar follows the customer on your page, desktop or mobile. It like, finds when people get frustrated or when there's not a button or when they have to search for your number or whatever. 
**Speaker 2** *[41:55]*: Is that a widget on WordPress or. 
**Speaker 1** *[41:59]*: Yes, but I'm sure there's a million other ways to use it because I know you don't have to be on WordPress to use hot Drawer. So I don't know how it works on other platforms, but I'm sure it's something that we can find a way to, like, implement it. I can essentially log on there and see, okay, this customer was on our website for 2 minutes and 30 seconds, and they clicked on this button, this button, and it shows like kind of a heat map of the website and stuff like that. So the education hub, we can definitely have blog posts on there. We do want to have kind of that, like, evergreen content or SEO purposes. And that is something that we are 100% lacking. We should have done this rebuild probably three years ago, but here we are. Here we are. 
**Speaker 1** *[42:47]*: Before you know it, you blink and you're here. Exactly. Just like, don't know how we're 11:30, but so under there we're gonna have like our roofing system. So kind of explain what it is that we do. A little bit of warranty is just kind of educational piece with that. GAF has a content builder. Okay. And so I can log on there and be like, oh, okay, yeah. I want to use this that they built out for, you know, customer, like contractors and stuff like that. So it might be like a little thing where you hover over it and it shows you each part of the roof. 
**Speaker 2** *[43:25]*: Just build that using Claude code as well. It's just like a custom one. If you want that or if you take that, it doesn't really matter. 
**Speaker 1** *[43:32]*: I mean if it's already built. 
**Speaker 2** *[43:34]*: Yeah, as long as we get the code. 
**Speaker 1** *[43:35]*: Okay. 
**Speaker 2** *[43:37]*: All right. 
**Speaker 1** *[43:37]*: So that would be like on our system page. Another one more like storm damage. So how we spot hail, wind damage, blah blah. Make it a ad converting page. So this one would be very important to have forms on it. We basically want forms on just about any page because we want to make sure that they somehow some way end up in our inbox or calling us. Yes. So mobile, of course we want a follow, you know, like a button called now that follows them on the page. On desktop it may be, you know, our number everywhere. And then forms kind of booking, bookending. 
**Speaker 2** *[44:14]*: Do you want both, like both options? Because I would kind of lean towards one or the other. 
**Speaker 1** *[44:19]*: So I break down kind of mobile versus desktop. So like for instance, how our page currently is on desktop, we would want a right hand side form at the top. But we don't want it. It's really long how it is right now. I want to shorten it. I want it to all fall above the fold and then essentially have like a banner of awards, things that we have. Blah blah. 
**Speaker 2** *[44:46]*: Okay. 
**Speaker 1** *[44:47]*: Text on the left, form on the right, banner book, fourth fold. On mobile it'd be different. Mobile, we've got a lot of small real estate, so from what I've found, you don't want a form because people literally have to scroll before they. So instead we would have like a button that essentially either brings them to like the footer where the we have another form or a pop up for a form. Either way we're fine with as long as it's just user friendly. 
**Speaker 2** *[45:19]*: Gotcha. 
**Speaker 1** *[45:21]*: And then like another one for like old roof red flags. Again those are two that were like. It's educational, but it's educational. Like CRM. Exactly. Name of the game. And then an about us page that will just be a single drop down. Bios, pictures, stories, blah blah. Yeah. And then a contact page. So that will kind of be the rundown of our menu on mobile version. We just want a like hamburger maybe menu or something because again, space is limited. 
**Speaker 2** *[45:56]*: Exactly. 
**Speaker 1** *[45:56]*: So all right, so this kind of breaks down that like mobile first. So and we have found with Hot Door and just tracking everything that almost like 90% of our website visitors are mobile. So it has to be mobile optimized yeah. Mobile first. 
**Speaker 2** *[46:14]*: So that's for every website nowadays. 
**Speaker 1** *[46:17]*: So obviously thumb zone we want. And if you think mobile and stuff like that is fine for like videos like for the hero we can do a video or just still photos there. Hamburger menu, sticky button bar for call now and then the like get a quote to open up that form. So form behavior, desktop versus mobile of course. Speed optimized and then lazy load of course for like scrolling. So that way we have really quick. Because right now our website is slow. It's garbage. It's absolutely. That's why when people go oh, I looked at. I'm like don't look at our website. It's corrupt. 
**Speaker 2** *[47:04]*: It gave it a C minus. It gave like here are five highly critical things you must do right now. 
**Speaker 1** *[47:11]*: Yeah. 
**Speaker 2** *[47:12]*: Like in one of your pages like you have like quotations and the Christiansburg page on there. It's like it's all templated. Google doesn't like this at all. It's content week. It's duplicate and then it has like quotations or I should say like Christianberg or something. And it got really bad at that. Did not like it at all. 
**Speaker 1** *[47:28]*: I think I would lose my mind honestly if I went through all the pages of our website right now which we. So our website is hosted by someone right now that were going to have them do a build out. Honestly like what maybe a year or so ago were in talks of all of that. They were the ones who essentially just mirrored our old website and rebuilt it. But because of crap like that, it's like you can't even maintain this really simple website. 
**Speaker 2** *[47:59]*: Right. 
**Speaker 1** *[47:59]*: We're not going to trust you to do a full rebuild for us. So that's where that kind of ended. Yeah. So kind of like the CRO of our. The way I like envision our homepage is essentially like a customer journey funnel. Like we are at every point we're trying to sell you on something, we're trying to figure out what that pain point is, why you're here, how we can convert you to a customer. 
**Speaker 2** *[48:29]*: Absolutely. 
**Speaker 1** *[48:30]*: While also speaking Google language. 
**Speaker 2** *[48:32]*: Yeah. 
**Speaker 1** *[48:34]*: All right, so I did make a list of the ones that I could think of right now that we're using like widgets, slash plugins, Google reviews. We use a map done through Pin Parrot so that's coded by them and we use it the GAF content builder, the financing gravity forms 404 automatic notification, broken link, but that's clearly not. And then site backup and then image and then this just went in a little Bit more detail of that breakout of that kind of home page framing of it. And then I haven't gotten around to all the individual pages of like kind of what we're looking for on them and all of that. But you feel super confident with making sure that we're saying Google Chrome compliant, we're not hurting our quality scores ranking. We're speaking Google's language. We can really hit SEO hard. 
**Speaker 2** *[49:44]*: It's going to be 200 times better than what you got right now. Because it's like what you have right now is. I mean it's clearly working since you guys are driving traffic. 
**Speaker 1** *[49:53]*: It works forms. 
**Speaker 2** *[49:53]*: It works forms, the traffic. I don't know what your numbers look like, but I guarantee you see a huge increase the changes I'm going to make. 
**Speaker 1** *[50:01]*: Yeah, and I think a big thing for us too is getting up quality scores on Google and having those pages specific to ads. I mean it's just going to help our Google Ads account perform so much better. We're gonna hopefully be able to spend a little bit less money to acquire these customers and then get them through the journey. Because it doesn't matter if we get them to our website if they're not taking action. 
**Speaker 2** *[50:25]*: Exactly, yeah. 
**Speaker 1** *[50:26]*: Oh, and then. Like pop ups. So what I've noticed because like I said, I've been studying a lot of these other websites, seeing what they're doing, what's working for them, blah, blah. I love the functionality of like when I go to get off of someone's website, a pop up happens. Now I do know that Google will red flag you if you try to divert because people from coming like from exiting especially. 
**Speaker 2** *[50:56]*: So when exit your website pop up comes up where it comes up like. 
**Speaker 1** *[51:00]*: On the screen or even if you go close to the X, it knows that you're about to try to leave. Okay, you can't like hide that, right? You're going to. Google's going to shut you down instantly. But if you go to exit off or whatever, it pop up will come up like wait, before you go 500 off replacement. It's essentially like one last grab to try to get that lead and to get their information. It might just be put in your email or put in your number or whatever. It's like a very simple last step. Or sometimes I've seen women roofing. Gosh, their website's fantastic. Let's see if it'll do it on mobile because I know mobile is a little bit different in that you don't really have the. So another form is like still there but below the fold. 
**Speaker 2** *[52:10]*: So. 
**Speaker 1** *[52:10]*: So maybe let's just see if I go, okay. No, it doesn't do it on mobile, so I don't think you can do it on mobile. But I know on desktop if you try to exit out, theirs pops up like way before you go. So there's two kind of pop ups that I like. The one being the exit strategy and the other one being like if you hit 50% or if you're on the page X amount of time it'll pop up like 0% financing or something to get them to take action. Looking around. Yeah, maybe it's a seasonal offer. We're slow as crap in the winter time, so maybe we're like 500 off, thousand off whatever. So pop up of that then also. 
**Speaker 1** *[52:55]*: And I know we've kind of chatted about this a little bit before, but like a bot or someone that they can talk to a little bit. But that bot is focused on getting information essentially like a AI receptionist, but in the form of. 
**Speaker 2** *[53:09]*: Yeah, it's like a little chat bot in the corner where they can like especially for mobile, should it gate keep it until they give it their phone or their name and their email? Or should it just be kind of like a librarian who kind of has a whole access and can point people in the right direction? I would go for that latter personally. Just, just so people can easily navigate the website. I know people like to have that little chatbot, but as soon as they ask like, oh, before you begin, give me your name and email. It's a good way to capture information, but I think it's just kind of obnoxious because it doesn't really deliver any value up front. 
**Speaker 1** *[53:43]*: What about people who know they can't get ahold of us because it's the weekend and our office isn't open? I don't know. I think we're just trying to bridge little gaps. Right. So like sometimes I've noticed on these other websites some of them have a bot, some of them have text now, if they text now still, nobody's going to get back to them right away unless we do an AI. 
**Speaker 2** *[54:05]*: That's kind of where the lead response agent comes in. 
**Speaker 1** *[54:07]*: Yeah. 
**Speaker 2** *[54:07]*: Kind of qualify them, ask them questions, make sure, get all their information, book them into an appointment on the calendar. So that's where I kind of see that coming in. Not exactly in the website, but kind of getting the information first and then directing them to an AI away from the website. 
**Speaker 1** *[54:25]*: So you're saying that the bot's Purpose would be to help them navigate, not. 
**Speaker 2** *[54:29]*: Necessarily information graphs, find specific content they're looking for. So say they type in the bot like, okay, yeah, my ceiling is leaking, I think I need a new roof. Then I'd be like, okay, and just take them to that page or something like that. It's kind of like a librarian, not like a salesperson. 
**Speaker 1** *[54:46]*: Okay. Like navigational assist essentially. So yeah, kind of figuring out what we want to have on the website that's like user friendly like that. Whether it's a text now and they text an AI receptionist or if it's like you said, more so like helping them navigate where they need to go to find the information for the answers that they or the questions that they have. Trying to think if there was anything else. I'm sure there is a million things. 
**Speaker 2** *[55:48]*: Right now and we'll get to them. As I start building this out, like, well, I mean obviously you have full control and you can be able to see like, okay, like I don't like this. And then bam, you fix it. So it's my. To a point, like we just gotta get started now and start building it and get something on the screen and then we can kind of get into the nitty gray details that aren't laid out in the plan or anything like that. 
**Speaker 1** *[56:09]*: Okay. And then what is kind of. I don't remember, I know you told us already, but like timeline, knowing kind of what we're looking for. And let's just say 15 service, like 15 location pages or whatever. So we have like our main two, they're not sub domain but whatever it's called to pages specific to locations. And then all of the service, all the, you know, pages that we're building out on site, all the SEO built onto it, all the back end stuff and then the service pages or location pages that we're not showing on. What do we think as far as like timeline for that? 
**Speaker 2** *[56:52]*: So kind of like the first draft, if you will. Yeah. I say a week. 
**Speaker 1** *[56:56]*: Yeah. 
**Speaker 2** *[56:56]*: And then I want to ask, so these blogs that you want to start getting up and running, are you planning on like doing that in house yourself or. I could do that as well, but it would be a little extra monthly. 
**Speaker 1** *[57:08]*: Yeah. How frequently do you really need to do blog posts? Because I've heard. 
**Speaker 2** *[57:16]*: Quarterly, I've heard, I would say two a week. 
**Speaker 1** *[57:20]*: Two a week. 
**Speaker 2** *[57:20]*: Two a week. Yeah. Google loves blogs. They love consistent, updated content. 
**Speaker 1** *[57:25]*: But what if nobody's writing them? 
**Speaker 2** *[57:27]*: Well, it drops traffic. That's the main goal of the blog, it drives traffic. So I kind of go through questions that people who indeed are ask themselves the keywords. Exactly right. And then write this evergreen content directed to those pain points. The goal is to get them into. 
**Speaker 1** *[57:42]*: The funnel, but that's what I'm saying. It's essentially ranking on Google in an organic way and driving. Driving people to the page because of the content. Because they search something related to that content. 
**Speaker 2** *[57:59]*: Exactly. 
**Speaker 1** *[58:00]*: So it's really hitting the SEO side of things. And organic to drive traffic, right? 
**Speaker 2** *[58:05]*: Yeah. It also helped with chatbot as well. I mean, obviously people are using a lot of catch bt, a lot of Claude to look up information and people usually talking like evergreen sense, like they have this problem, I want to fix this problem now. Then it'll help with that kind of back end as well when it comes to these LLMs and these AI chatbots. 
**Speaker 1** *[58:24]*: Okay, so if you were doing. 
**Speaker 2** *[58:26]*: You said two a week, it'd be two a week. Yeah. 
**Speaker 1** *[58:30]*: What would that look like on top of the monthly retainer? 
**Speaker 2** *[58:35]*: So for the website, it would be three grand up front and then it'd be 500amonth for those SEO for the blogs. 
**Speaker 1** *[58:47]*: Okay. 
**Speaker 2** *[58:52]*: And what I might do too is like I might just front load them. I might just create 16 to start or something. Since you guys don't have anything going right now, then we'll get those like a few up, kind of batch them out, you know. But yeah, like through the course of like the time we're working together, it'd be a wrap too. 
**Speaker 1** *[59:10]*: Okay. 
**Speaker 2** *[59:13]*: And as far as like that lead response agent that we're kind of discussing a few a month and a half ago, is that in the cards? Cuz I know that would be a big game changer for Speed of Lead. 
**Speaker 1** *[59:23]*: Definitely. Everything is still in the cards. It was really just time of implementation and knowing I know the guys get really excited when there's cool things. Trust me, I love it all too. But I'm also like realistic with how much time everything takes. Even though you're building it out for us, we still have to be able to provide all the information. Same thing with this, the framework of how we want it. If we just said, hey Colin, go make us a website, it might be fantastic, but then there might be a lot more back and forth like, hey, I really wanted this, I wanted this, blah, blah. So there's still like a ton of that back and forth while we're also trying to open up another location and we're about to hit our busy season. 
**Speaker 1** *[01:00:04]*: Like now that the Weather is like this, the phone does not stop. So all of those things are still absolutely in the cards and I think they will all be things that we pull the lever on just in the right timing. So website being first. But I do agree with you with maybe the AI kind of chat thought recess. 
**Speaker 2** *[01:00:27]*: We response yeah, there we go. 
**Speaker 1** *[01:00:29]*: We response maybe coming around the same time as this. So that way the two can play with like play into each other and we use one to make the other work. 
**Speaker 2** *[01:00:40]*: Exactly, yeah. 
**Speaker 1** *[01:00:42]*: So I definitely think that's still a possibility. So today I just kind of wanted to put my mind at ease only because it's not so much the investment monetarily, it's an investment of time to run this price list and we want to make sure that we're making the right decision because we do want this to be a lasting relationship and build and all the things. We don't want to be talking websites again in a year. 
**Speaker 2** *[01:01:09]*: Exactly, yeah. 
**Speaker 1** *[01:01:10]*: So we wanted to make sure that we're all on the same page and we're super confident that this is the right direction and the build out will be exactly what we want and what we need and what Google wants to see as well. So yeah, I just want to do a little bit of looking into this just because I haven't heard of any of this before. I'm old school and WordPress is the only thing I really know. So just kind of understanding how it works and knowing that like, because we've had people come in here and try to sell us like drag and drop websites and we're like not going to happen. Right. And we're not going to invest that amount of money in something that's, there's no longevity in it. 
**Speaker 2** *[01:01:55]*: Right? 
**Speaker 1** *[01:01:55]*: Yeah, just a waste of time and money. So definitely, you know, I think we're very close. Like I said, I just want some time to kind of look into this, understand it and then I think we're excited and ready to really get the ball rolling. I know it's going to be a lot of work, but it'll be worth it when it's helping everything. 
**Speaker 2** *[01:02:22]*: Exactly. 
**Speaker 1** *[01:02:23]*: We are a lead based business and that is the one and only thing that actually really matters to my jobs. Right. 
**Speaker 2** *[01:02:29]*: Yeah. 
**Speaker 1** *[01:02:30]*: Making sure that the website is good and functioning and actually helping us and not hurting us is where we need to be at. So. 
**Speaker 2** *[01:02:37]*: So yeah, time's the constraint really. It's not really monetary, it's saving you time. So if we could move forward today, get everything settled, I can start building it by Next week we set a meeting literally the same time that works for you. And then basically just go through the whole website, find all the little details that you want to fix and then go from there. Just make the whole process a lot smoother. And then, I mean, I want to kind of research those like Vercel. I mean it's a hosting platform. It's kind of same as WordPress. So. Yeah. 
**Speaker 1** *[01:03:06]*: Yeah. All right. Give me. I'm not a. I'm not an on spot person. 
**Speaker 2** *[01:03:11]*: Okay. 
**Speaker 1** *[01:03:13]*: But give me kind of till end of the day. Like I said. I just want to look at it. 
**Speaker 2** *[01:03:16]*: Yeah. 
**Speaker 1** *[01:03:17]*: Put my mind at ease. And then I think we'll. We'll be good to go. 
**Speaker 2** *[01:03:23]*: Cool. So end of day today? Yeah, Cool, sounds good. 
**Speaker 1** *[01:03:26]*: Send her an email. 
**Speaker 2** *[01:03:27]*: Awesome, Sounds good. Can you also send me all this docs as well? Yeah, yeah, perfect. 
**Speaker 1** *[01:03:30]*: Of course. 
**Speaker 2** *[01:03:31]*: Sweet. Awesome. 
**Speaker 1** *[01:03:32]*: And I'll keep working on the one that's happened more. So like the front framework and I know that will obviously be like conversation between us, but if I can kind of have roughly on the big picture of what we're looking for and then you can do all the ins and outs of everything, I think that'll help just kind of streamline it. Cool. 
**Speaker 2** *[01:03:52]*: Awesome. Well, great. I'm excited. Excited. This is going to be good. 
**Speaker 1** *[01:03:55]*: Thank you so much for your time today. 
**Speaker 2** *[01:03:57]*: Thank you. 
**Speaker 1** *[01:03:57]*: Answering all about a million questions. 
**Speaker 2** *[01:03:59]*: No worries at all. 
**Speaker 1** *[01:04:00]*: And I'll email you. 
**Speaker 2** *[01:04:01]*: Cool, sounds good. All right, take care. 
**Speaker 1** *[01:04:04]*: You as well. Enjoy the sunshine. 
**Speaker 2** *[01:04:09]*: Thank you. Oh, forward payment. I think me and Austin talked briefly. There could be a check for up front and then monthly. Just me through a stripe invoice. 
**Speaker 1** *[01:04:21]*: Stripe. 
**Speaker 2** *[01:04:21]*: Okay, that works. 
**Speaker 1** *[01:04:22]*: Yep. 
**Speaker 2** *[01:04:22]*: Cool, sounds good. All right, four here for you. 
**Speaker 1** *[01:04:24]*: Thank you. 
**Speaker 2** *[01:04:24]*: All right, take care. Bye. 
**Speaker 1** *[01:04:28]*: It. 
