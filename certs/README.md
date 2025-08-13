# PassKit Certificates

This directory contains the certificates required for PassKit Apple Wallet and Google Pay integration.

## Required Files

- `ca-chain.pem` - Certificate Authority chain file
- `certificate.pem` - Client certificate file  
- `private-key.pem` - Private key file

## Setup Instructions

1. Create a PassKit developer account at https://dev.passkit.com
2. Generate certificates in the PassKit Portal
3. Download the certificate files
4. Place them in this directory with the exact names listed above
5. Set `PASSKIT_ENABLED=true` in `.env.local` when ready to use

## Security Note

These certificate files should never be committed to version control.
They are already listed in .gitignore for security.