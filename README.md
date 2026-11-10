# KM Cabs — KM Enterprises

Static website for cab, rental, outstation and goods transport services in **Bokaro**, **Ranchi** and **Kolkata**.

## Features

- Rapido-style home booking widget (white & blue)
- Fare estimates by vehicle with platform fee ₹0.75–₹0.99
- Request callback → email to `koushalmandal05@gmail.com` (FormSubmit)
- Service pages + full legal pages
- Ready for Netlify + GitHub

## Local preview

Open `index.html` in a browser, or run any static server:

```bash
npx serve .
```

## Deploy to Netlify via GitHub

1. Create a GitHub repository and push this project.
2. In [Netlify](https://app.netlify.com), choose **Add new site → Import an existing project**.
3. Connect the GitHub repo.
4. Build settings:
   - **Build command:** leave empty
   - **Publish directory:** `.` (site root)
5. Deploy.

`netlify.toml` already sets the publish directory.

## Email callbacks (important)

Callback and contact forms use [FormSubmit](https://formsubmit.co) to send mail to:

`koushalmandal05@gmail.com`

**First submission:** FormSubmit sends a one-time activation email to that inbox. Open it and confirm. After that, requests arrive automatically.

## Project structure

```
index.html          Home + fare flow
about.html
contact.html
services/           Cab, rental, outstation, goods
legal/              Privacy, terms, refund, cancellation, cookies, disclaimer
css/styles.css
js/app.js
js/fare.js
netlify.toml
```

## Brand

**KM Cabs** by KM Enterprises  
Support: koushalmandal05@gmail.com
