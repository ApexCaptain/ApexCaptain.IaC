#!/bin/sh

while ! command -v sshd > /dev/null 2>&1; do
    echo "Installing APK Packages..."
    apk add --no-cache openssh curl
    if [ $? -eq 0 ]; then
        echo "SSH installed successfully."
        mkdir -p /root/.ssh && chmod 700 /root/.ssh
        ssh-keygen -t rsa -b 2048 -f /root/.ssh/id_rsa -N ''
        cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys
        chmod 600 /root/.ssh/authorized_keys
        ls -al /root/.ssh
        ssh-keygen -A
        break
    else
        echo "Failed to install APK Packages. Retrying in 5 seconds..."
        sleep 5
    fi
done

/usr/sbin/sshd

POD_INDEX=$(echo $HOSTNAME | awk -F '-' '{print $NF}')
VPN_USERNAME=$(eval echo '$VPN_USERNAME_'$POD_INDEX)
VPN_PASSWORD=$(eval echo '$VPN_PASSWORD_'$POD_INDEX)

sed -i 's/lns = .*/lns = '$VPN_SERVER_ADDR'/' /etc/xl2tpd/xl2tpd.conf
sed -i 's/name .*/name '$VPN_USERNAME'/' /etc/ppp/options.l2tpd.client
sed -i 's/password .*/password '$VPN_PASSWORD'/' /etc/ppp/options.l2tpd.client

(
    (sleep 7 && echo "c myVPN" > /var/run/xl2tpd/l2tp-control) &
    exec /usr/sbin/xl2tpd -p /var/run/xl2tpd.pid -c /etc/xl2tpd/xl2tpd.conf -C /var/run/xl2tpd/l2tp-control -D
) &

(
    while true; do
        if ip route show dev ppp0 | grep -q 'proto'; then
            break
        fi
        echo "Waiting for route to appear..."
        sleep 5
    done
    
    for EACH_VPN_IP in $(echo $VPN_IPS_TO_ROUTE | tr ',' '\n'); do
        ip route add "$EACH_VPN_IP" via $VPN_GATEWAY_IP dev ppp0
    done
) &

while ! nc -z localhost 22; do   
  echo "Waiting for SSH to be available on port 22..."
  sleep 5
done

echo "Starting SSH tunnel..."
ssh -o StrictHostKeyChecking=no -N -D 0.0.0.0:$PROXY_PORT root@localhost