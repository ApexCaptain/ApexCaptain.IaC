# ApexCaptain.IaC

On-Premise, Oracle Cloud Infrastructure 기반의 멀티 k8s 클러스터를 구축 및 관리하는 IaC 프로젝트입니다.

## 🎯 주요 기능

### 1. 멀티 Kubernetes 클러스터 아키텍처 구축

- Oracle Cloud OKE 클러스터(클라우드)와 On-premise 클러스터를 통합 관리하는 환경 구축
- Istio 멀티 클러스터 서비스메시 구성 완료 - OKE와 Workstation 클러스터 간 서비스 메시 통합
- Istio 서비스 메시와 L2TP VPN 프록시를 구현하여 네트워크 격리와 보안을 동시에 확보

### 2. 100% 코드 기반 인프라 관리 시스템 개발

- TypeScript + CDKTF를 활용한 선언적 인프라 정의로 30개 이상의 독립적인 인프라 스택 관리
- 선택적 스택 배포 시스템 구현 (대화형 CLI 도구 개발)
- Terraform 상태 파일의 안전한 관리와 버전 관리를 위해 Google Drive 연동 로컬 백엔드, 자동 백업 스크립트 구현, 스택별 독립적인 상태 관리

### 3. 종합적인 보안 체계 및 DNS/CDN 관리

- Authentik 중앙 인증 처리 시스템 구현 - 멀티 클러스터 환경에서 중앙화된 인증 시스템 구축 (Istio Ingress + Nginx Ingress 통합 지원)
- OAuth2 Proxy를 통한 GitHub OAuth 인증 시스템 구현
- Cert-Manager를 활용한 SSL/TLS 인증서 자동 관리 시스템 구축
- Bastion 호스트를 통한 Zero Trust 네트워크 아키텍처 구현
- Cloudflare를 활용한 DNS 관리 및 CDN 구성, 방화벽 정책 설정

### 4. 개인 미디어 & 게임 서버 인프라 구축

- Jellyfin 미디어 스트리밍 서버 구축 및 운영
- qBittorrent 토렌트 관리 시스템 구현
- 7 Days to Die 게임 서버 운영
- On-premise Longhorn 분산 스토리지 시스템을 도입하여 HDD/SSD 하이브리드 구성으로 성능과 용량을 최적화

### 5. DevOps 도구 및 자동화

- Prometheus + Grafana 모니터링 스택 구축
- ArgoCD 기반 GitOps 워크플로우 구축

### 6. 기타 개발 보조 도구

- CloudBeaver 데이터베이스 관리 도구 통합
- Redis UI 관리 인터페이스 구축
- Windows 원격 데스크톱 환경 구축

## 🏗️ 기술 스택

### 핵심 기술

- **CDK for Terraform (CDKTF)** - TypeScript 기반 인프라 정의
- **Oracle Cloud Infrastructure (OCI)** - 클라우드 플랫폼
- **Kubernetes** - 컨테이너 오케스트레이션
- **Istio** - 서비스 메시
- **ArgoCD** - GitOps 배포 관리
- **Longhorn** - 분산 스토리지 시스템
- **MetalLB** - 로드 밸런서
- **Cloudflare** - DNS 및 CDN 관리

### 개발 도구

- **TypeScript** - 메인 개발 언어
- **NestJS** - 애플리케이션 프레임워크
- **Projen** - 프로젝트 자동화 도구
- **ESLint + Prettier** - 코드 품질 관리
- **Yarn** - 패키지 관리

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

## 📊 프로젝트 규모

- **총 스택 수**: 30+ 개의 독립적인 인프라 스택
- **배포된 애플리케이션**: 20+ 개의 컨테이너화된 서비스
- **지원 환경**: 클라우드(OCI) + On-premise 하이브리드
- **자동화 수준**: 100% 코드 기반 인프라 관리

### 🏗️ 인프라 스택 구성

**Oracle Cloud OKE (클라우드)**

- 시스템: ArgoCD, Istio, Vault, Prometheus+Grafana, Cert-Manager, Ingress Controller
- 애플리케이션: CloudBeaver, Redis UI, OAuth2 Proxy, Home L2TP VPN Proxy, NFS Server, Dashboard

**On-premise Workstation**

- 시스템: Istio, Longhorn Storage, MetalLB, Prometheus+Grafana, Cert-Manager, Ingress Controller
- 미디어/게임: Jellyfin, qBittorrent, 7 Days to Die, Game SFTP, NAS SFTP
- 개발 도구: Windows Desktop, Development Pods

## 🎯 핵심 성과

- **하이브리드 멀티 클러스터** 환경 구축 (OKE + Workstation)
- **100% 코드 기반** 인프라 관리 (TypeScript + CDKTF)
- **GitOps 워크플로우** 구현으로 배포 자동화 (ArgoCD 기반)
- **Zero Trust 네트워크** 아키텍처 구현
- **분산 스토리지** 시스템 (Longhorn - HDD/SSD 하이브리드)
- **개인 미디어 & 게임 서버** 통합 관리
