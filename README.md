# ApexCaptain.IaC

CDK for Terraform project of ApexCaptain

## Working On...

### Kubernetes on Workstation

- Need to replace sftp to nas server
- 7 Days to Die Game Server
- Palworld Game Server

ssh -o StrictHostKeyChecking=no -o ProxyCommand="nc -X 5 -x $DYNAMIC_ENVIRONMENT_K8S_OKE_APEX_CAPTAIN_SIMPLE_PROXY_URL %h %p" -i ./keys/K8S_Oke_Cluster_Stack-privateKey-privateSshKeyFileInKeys.key opc@10.0.1.158
