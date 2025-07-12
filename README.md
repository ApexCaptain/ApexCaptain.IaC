# ApexCaptain.IaC

CDK for Terraform project of ApexCaptain

## 📝 ToDo

### 🔧 공통사항

- [ ] **Terraform State 백업**: 20개 복사본 보관으로 자동 백업 구현
- [ ] **Istio 멀티 클러스터**: 두 K8s 클러스터 간 통신 연결
- [ ] **모니터링 마이그레이션**: 대시보드를 Prometheus, Grafana, ELK 스택으로 교체

### ☁️ K8S OCI 클러스터

#### 🔐 인증 및 보안

- [ ] **Authentik**
  - [Helm Chart](https://docs.goauthentik.io/docs/install-config/install/kubernetes)
  - [Terraform Provider](https://github.com/goauthentik/terraform-provider-authentik)
- [ ] **Vault**
  - ⚠️ **상태**: 배포 완료했으나 외부 인증 제공자 통합 대기 중

#### 🎮 게임 서버

- [ ] **7 Days to Die 게임 서버**
  - [Docker Image](https://hub.docker.com/r/ich777/csmm-7dtd)
- [ ] **Palworld 게임 서버**
  - [Docker Image](https://hub.docker.com/r/thijsvanloef/palworld-server-docker)

#### 🚀 DevOps 도구

- [ ] **ArgoCD**: GitOps 배포 관리

### 💻 K8S Workstation 클러스터

- [ ] **DevPod 활성화**
  - ⚠️ **참고**: 복잡성으로 인해 일시적으로 우선순위 낮춤

## 🍽️ Post-Diet Wishlist

> _"다이어트 끝나면 먹고싶은 거..."_

- [ ] 🐟 **물회**
- [ ] 🍩 **크리스피크림 오리지널 글레이즈드 도넛**
- [ ] 🍜 **규스지니코미**
- [ ] 🍖 **톤지루**

---

## 📚 참고 자료

- [CDK for Terraform 문서](https://developer.hashicorp.com/terraform/cdktf)
- [Kubernetes 문서](https://kubernetes.io/docs/)
- [Istio 문서](https://istio.io/docs/)
