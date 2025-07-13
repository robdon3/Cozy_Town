# 🚀 Deploying Cozy Town to GitHub Pages

Follow these steps to host your Cozy Town game on GitHub Pages so you can play it on your phone!

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Name your repository (e.g., `cozy-town-game`)
4. Make it **Public** (required for free GitHub Pages)
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Connect Your Local Repository

Run these commands in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section (in the left sidebar)
4. Under **Source**, select **GitHub Actions**
5. The deployment workflow will automatically run when you push code

## Step 4: Access Your Game

After the deployment completes (usually takes 1-2 minutes):

1. Go to your repository's **Actions** tab
2. Click on the latest workflow run
3. Look for the deployment URL (usually something like `https://YOUR_USERNAME.github.io/REPO_NAME/`)
4. **Bookmark this URL on your phone!**

## Step 5: Mobile Optimization

The game is already optimized for mobile with:

- ✅ **Responsive viewport** settings
- ✅ **Touch controls** with virtual joystick
- ✅ **iPhone notch support** with safe area insets
- ✅ **Pull-to-refresh prevention**
- ✅ **Mobile-optimized UI** with proper touch targets
- ✅ **Landscape/portrait mode** support

## Troubleshooting

### If the site doesn't load:
1. Check the **Actions** tab for any deployment errors
2. Make sure your repository is **Public**
3. Wait a few minutes for the deployment to complete

### If the game doesn't work on mobile:
1. Clear your browser cache
2. Try opening in an incognito/private window
3. Make sure you're using a modern mobile browser (Safari, Chrome, Firefox)

### If you need to update the game:
1. Make your changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update game features"
   git push
   ```
3. The site will automatically redeploy

## Game URL Format

Your game will be available at:
```
https://YOUR_USERNAME.github.io/REPO_NAME/
```

For example:
```
https://johndoe.github.io/cozy-town-game/
```

## Mobile Browser Compatibility

✅ **iOS Safari** (recommended)
✅ **Chrome Mobile**
✅ **Firefox Mobile**
✅ **Samsung Internet**
✅ **Desktop browsers** (for testing)

---

**Enjoy playing Cozy Town on your phone! 🏠📱** 