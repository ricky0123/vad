# Load pulseaudio virtual audio source
pulseaudio -D --exit-idle-time=-1

# Create virtual output device (used for audio playback)
pactl load-module module-null-sink sink_name=DummyOutput sink_properties=device.description="Virtual_Dummy_Output"

# Create virtual microphone output, used to play media into the "microphone"
pactl load-module module-null-sink sink_name=MicOutput sink_properties=device.description="Virtual_Microphone_Output"

# Set the default source device (for future sources) to use the monitor of the virtual microphone output
pacmd set-default-source MicOutput.monitor

# Create a virtual audio source linked up to the virtual microphone output
pacmd load-module module-virtual-source source_name=VirtualMic

# Allow pulse audio to be accssed via TCP (from localhost only), to allow other users to access the virtual devices
pacmd load-module module-native-protocol-tcp auth-ip-acl=127.0.0.1

# Configure the "seluser" user to use the network virtual soundcard
mkdir -p /home/root/.pulse
echo "default-server = 127.0.0.1" > /home/root/.pulse/client.conf
chown root:root /home/root/.pulse -R
