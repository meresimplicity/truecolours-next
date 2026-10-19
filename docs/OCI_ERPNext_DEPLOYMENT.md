# Oracle Cloud deployment: ERPNext + POS Next

Oracle Cloud Infrastructure (OCI) is the selected online host. The Next.js admin launches the POS at `POSNEXT_URL/pos/`; the POS and its Frappe backend run on OCI.

## Planned layout

```text
Till browsers at each branch
  └── HTTPS to the Oracle Cloud site
        └── Ubuntu ARM64 VM
              ├── Frappe + ERPNext + POS Next
              ├── MariaDB + Redis + background workers
              └── persistent site and database storage
```

This is a centralized cloud server, not a local shop server. If a branch loses its internet connection, POS Next can use data already cached on that register and queue supported sales there; it cannot send sales to OCI or synchronize stock with the other branch until connectivity returns. Two branches can therefore sell the same remaining stock while disconnected. Test the conflict and reconciliation process before enabling offline sales.

## OCI Always Free limits and suitability

Oracle's current Always Free Ampere A1 allowance is **2 OCPUs and 12 GB RAM in total**, available in the tenancy's home region. Capacity may be unavailable. The tenancy also has a combined 200 GB block-volume allowance for boot and data volumes. Oracle may reclaim an Always Free compute instance if its CPU, network, and (for A1) memory utilization all stay below 20% for seven days.

Treat Always Free as a development or pilot host. It does not provide the operational assurance, support, or independent backup plan needed for live retail checkout. For business use, keep Oracle as the provider but plan for a paid OCI account or supported hosting, monitoring, verified off-server backups, and a tested restore process.

Sources: [Oracle Always Free resources and limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [Oracle Free Tier terms](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm).

## Deployment steps

1. **Create the OCI account and choose its home region.** Always Free compute must be created in that home region. Choose a region with good connectivity for both branches. If the A1 shape reports insufficient capacity, retry later or use the paid option rather than building the rollout around an unavailable VM.
2. **Create one VM.Standard.A1.Flex instance** using an Always Free eligible Ubuntu ARM64 image. Keep the instance within the 2 OCPU / 12 GB allowance and plan disk use across the account's 200 GB block-volume budget. Oracle's [Linux VM tutorial](https://docs.oracle.com/en-us/iaas/Content/Compute/tutorials/first-linux-instance/overview.htm) shows the Console flow.
3. **Harden network access.** Use an OCI security list or network security group and the VM firewall. Allow SSH on TCP 22 only from the administrator's IP address. Allow public TCP 80 and 443 for the web server and HTTPS. Do not expose MariaDB, Redis, Frappe's development port, or internal worker ports to the internet. See Oracle's [security list guide](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/creating-securitylist.htm).
4. **Build the Frappe production image for ARM64.** Use the official [Frappe Docker deployment method](https://github.com/frappe/frappe_docker/blob/main/docs/01-getting-started/01-choosing-a-deployment-method.md) and its custom or layered production image path. Include ERPNext v15 and POS Next's stable `version-15` app in the image. The current upstream [production Compose file](https://github.com/frappe/frappe_docker/blob/main/compose.yaml) pins services to `linux/amd64`, so it cannot be used unchanged on OCI's ARM64 A1 VM. The ARM64 guide demonstrates ARM container builds, but its example uses `pwd.yml`, which the deployment guide reserves for disposable exploration. I’m treating that ARM64 example as an architecture reference, not a production recipe. Build an ARM64 production image, adjust the Compose platform for every service, and test all POS Next dependencies on A1 before using it for sales. Do not deploy the checked-in `operating system/POSNext-develop` branch as the production version; that project's README marks `develop` unstable and recommends `version-15` for production.
5. **Create the ERPNext site and configure the business.** Add the company, both branch warehouses, item codes and barcodes, price lists, taxes, payment modes, POS profiles, receipt format, and named staff accounts. ERPNext staff permissions are separate from Firebase/NextAuth permissions.
6. **Connect a domain and HTTPS.** Point a DNS name to the OCI VM, configure the production reverse proxy and TLS certificate, and confirm the site opens at that HTTPS address. POS Next's offline service worker needs a secure origin outside localhost.
7. **Import and reconcile data.** Plan a migration for the current Firebase catalogue, product codes, prices, stock, and customers. The POS launcher does not perform this migration, and there is no live Firebase-to-ERPNext synchronization.
8. **Configure this admin launcher.** Set `POSNEXT_URL` in the Next.js deployment to the HTTPS ERPNext site address, for example `https://erp.example.com`. `/admin/pos` will then open `https://erp.example.com/pos/`.
9. **Pilot at both branches.** Verify checkout, taxes, stock movements, returns, cash reconciliation, offline queueing and replay, barcode scanners, receipts, and backups using the actual devices and network. Test one branch offline while the other remains online, then verify how any conflicting sales and stock are resolved.

## Keep these systems separate until migration is complete

The Next.js website/admin currently uses Firebase for its catalogue and customer/order data. ERPNext will have its own item, stock, customer, and invoice records. Until data is migrated and reconciled, treat ERPNext as a pilot POS and do not enter live sales into both systems as if they shared inventory.

## Reference documentation

- [Frappe Docker: deployment method selection](https://github.com/frappe/frappe_docker/blob/main/docs/01-getting-started/01-choosing-a-deployment-method.md)
- [Frappe Docker: ARM64 notes](https://github.com/frappe/frappe_docker/blob/main/docs/01-getting-started/03-arm64.md)
- [POS Next installation and production branch guidance](../operating%20system/POSNext-develop/README.md)
