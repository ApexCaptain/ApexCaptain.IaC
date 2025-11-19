# ApexCaptain.IaC

On-Premise, Oracle Cloud Infrastructure 기반의 멀티 k8s 클러스터를 구축 및 관리하는 IaC 프로젝트입니다.

## 🎯 주요 기능

### 인프라 아키텍처

- **멀티 클러스터**: OKE(클라우드) + Workstation(On-premise) 하이브리드 환경
- **Istio 서비스 메시**: 멀티 클러스터 서비스 메시 통합, Istio Gateway 기반 인그레스
- **Zero Trust 네트워크**: Bastion 호스트, L2TP VPN 프록시를 통한 네트워크 격리

### 인프라 관리

- **코드 기반 관리**: TypeScript + CDKTF로 30+ 개의 독립적인 인프라 스택 관리
- **선택적 배포**: 대화형 CLI 도구를 통한 스택별 배포
- **상태 관리**: Google Drive 연동 로컬 백엔드, 자동 백업, 스택별 독립 상태 관리

### 보안 및 인증

- **Authentik**: 멀티 클러스터 중앙 인증 시스템 (Istio Gateway 통합)
- **Cert-Manager**: SSL/TLS 인증서 자동 관리
- **Cloudflare**: DNS/CDN 관리 및 Ruleset 기반 방화벽 정책

### 모니터링 및 관찰성

- **메트릭**: Prometheus + Grafana (양쪽 클러스터)
- **서비스 메시**: Kiali를 통한 멀티 클러스터 시각화
- **로그**: Loki(OKE 중앙화) + Promtail(양쪽 클러스터, Workstation → OKE 원격 전송)
- **Istio 모니터링**: istiod ServiceMonitor, Envoy PodMonitor

### 애플리케이션

- **미디어/게임**: Jellyfin, qBittorrent, 7 Days to Die
- **AI 서비스**: Ollama, Open WebUI
- **개발 도구**: CloudBeaver, Redis UI, Windows Desktop
- **DevOps**: ArgoCD GitOps, Longhorn 분산 스토리지

## 🏗️ 기술 스택

**인프라**: CDKTF, OCI, Kubernetes, Istio, ArgoCD, Longhorn, MetalLB  
**모니터링**: Prometheus, Grafana, Kiali, Loki, Promtail  
**보안**: Authentik, Cert-Manager, Cloudflare  
**개발**: TypeScript, NestJS, Projen, ESLint, Prettier, Yarn

## 🚀 주요 스크립트

| 스크립트                   | 설명                          |
| -------------------------- | ----------------------------- |
| `yarn build`               | 프로젝트 빌드                 |
| `yarn tf@build`            | CDKTF 코드 신시사이즈 (synth) |
| `yarn tf@deploy`           | 전체 인프라 배포 (병렬 20)    |
| `yarn tf@deploy:selection` | 선택적 스택 배포 (대화형)     |
| `yarn tf@deploy:single`    | 단일 스택 배포                |
| `yarn tf@plan`             | 배포 계획 확인 (diff)         |
| `yarn tf@install`          | Terraform provider 초기화     |
| `yarn tf@backup`           | tfstate 파일 백업             |
| `yarn tf@clean`            | CDKTF 출력 디렉토리 정리      |
| `yarn terminal`            | 대화형 터미널 도구 v2         |

## 📊 인프라 구성

**OKE (클라우드)**

- 시스템: ArgoCD, Istio Gateway, Vault, Prometheus+Grafana+Kiali+Loki, Cert-Manager, Authentik
- 모니터링: istiod ServiceMonitor, Envoy PodMonitor
- 로그: Loki(중앙화) + Promtail
- 애플리케이션: CloudBeaver, Redis UI, L2TP VPN Proxy, NFS Server, Dashboard

**Workstation (On-premise)**

- 시스템: Istio Gateway, Longhorn, MetalLB, Prometheus+Grafana, Cert-Manager, Authentik Outpost
- 모니터링: Envoy PodMonitor
- 로그: Promtail → OKE Loki 원격 전송
- 애플리케이션: Jellyfin, qBittorrent, 7 Days to Die, Ollama, Open WebUI, Windows Desktop

**규모**: 30+ 인프라 스택, 20+ 컨테이너화된 서비스
