# 🚀 GitHub Pages Setup Guide for AgroVia

## 📋 **Manual Setup Steps**

Since you're getting a Pages enablement error, follow these steps to manually configure GitHub Pages:

### **Step 1: Enable GitHub Pages in Repository Settings**

1. Go to your repository: `https://github.com/AnujPisal12/AgroVia1.0`
2. Click on **Settings** tab (top navigation)
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

### **Step 2: Verify Repository Permissions**

Make sure your repository has the correct permissions:
- Go to **Settings** → **Actions** → **General**
- Under **Workflow permissions**, select **Read and write permissions**
- Check **Allow GitHub Actions to create and approve pull requests**
- Click **Save**

### **Step 3: Trigger the Deployment**

After enabling Pages, you can trigger deployment by:

**Option A: Push a new commit**
```bash
git add .
git commit -m "fix: Update GitHub Pages configuration"
git push origin main
```

**Option B: Manual trigger**
1. Go to **Actions** tab in your repository
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow** button
4. Select **main** branch and click **Run workflow**

## 🔧 **Configuration Files Updated**

### **1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v4
        with:
          enablement: true
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### **2. Vite Configuration (`vite.config.ts`)**
```typescript
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? "/AgroVia1.0/" : "/",
  // ... other config
}));
```

## 🌐 **Expected Deployment URL**

Once successfully deployed, your app will be available at:
```
https://anujpisal12.github.io/AgroVia1.0/
```

## 🔍 **Troubleshooting**

### **If deployment still fails:**

1. **Check Actions tab** for detailed error logs
2. **Verify build process** by running locally:
   ```bash
   npm run build
   ```
3. **Check repository visibility** - make sure it's public
4. **Verify branch name** - ensure you're pushing to `main` branch

### **Common Issues:**

- **404 errors**: Usually caused by incorrect `base` path in `vite.config.ts`
- **Build failures**: Check for TypeScript errors or missing dependencies
- **Permission errors**: Ensure Actions have write permissions

## ✅ **Verification Steps**

After deployment:
1. Check the **Actions** tab for successful workflow runs
2. Visit the deployment URL
3. Test all functionality including:
   - QR scanner (camera permissions)
   - Mobile responsiveness
   - Interactive charts
   - Form submissions

## 📞 **If You Still Have Issues**

If you continue to face problems:
1. Share the specific error message from the Actions tab
2. Check if the repository is public
3. Verify that you have admin access to the repository
4. Consider using alternative deployment platforms like Vercel or Netlify

## 🎉 **Success Indicators**

You'll know it's working when:
- ✅ Actions tab shows green checkmarks
- ✅ Pages section shows "Your site is live at..."
- ✅ The URL loads your application
- ✅ All features work as expected

Follow these steps and your AgroVia application should be successfully deployed to GitHub Pages!