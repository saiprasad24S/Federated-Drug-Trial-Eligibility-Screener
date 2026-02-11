# Instructions to Push Changes to GitHub

The local changes have been committed successfully. To push them to GitHub, you need to authenticate.

## Option 1: Using GitHub Personal Access Token (Recommended)

1. Generate a Personal Access Token on GitHub:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" > "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token" and copy it

2. Push with the token using this command:
```powershell
cd "c:\Users\bhavi\OneDrive\Documents\Projects\project\federated_screener"
git push https://oauth2:<YOUR_TOKEN_HERE>@github.com/Nityam2305/Federated-Drug-Trial-Eligibility-Screener.git master
```

Replace `<YOUR_TOKEN_HERE>` with your actual token from step 1.

## Option 2: Using Git Credential Manager

If you have a GitHub account logged in to your Windows credential manager:

```powershell
cd "c:\Users\bhavi\OneDrive\Documents\Projects\project\federated_screener"
git push -u origin master
```

This will prompt you to log in with your GitHub credentials through a browser window.

## Option 3: Using SSH (Most Secure)

1. Generate SSH key if you don't have one:
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Add SSH key to GitHub:
   - Go to https://github.com/settings/ssh/new
   - Copy your public key from `~/.ssh/id_ed25519.pub`

3. Update remote and push:
```powershell
cd "c:\Users\bhavi\OneDrive\Documents\Projects\project\federated_screener"
git remote set-url origin git@github.com:Nityam2305/Federated-Drug-Trial-Eligibility-Screener.git
git push -u origin master
```

## Verify the Push

After pushing, verify the changes are on GitHub by visiting:
https://github.com/Nityam2305/Federated-Drug-Trial-Eligibility-Screener

The commit "Add CSV upload support and blockchain logging for data imports" should be visible.
