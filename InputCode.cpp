#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

MAX30105 particleSensor;

long lastBeat = 0;
float beatsPerMinute;

const int MAX_SAMPLES = 30;
int sampleCount = 0;

void setup() {
  Serial.begin(115200);
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30105 was not found. Please check wiring.");
    while (1);
  }

  particleSensor.setup(); // Default settings
  particleSensor.setPulseAmplitudeRed(0x0A); // Red LED low
  particleSensor.setPulseAmplitudeGreen(0);  // Turn off Green LED
}

void loop() {
  if (sampleCount >= MAX_SAMPLES) return;

  long irValue = particleSensor.getIR();

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      sampleCount++;
      Serial.print("IR=");
      Serial.print(irValue);
      Serial.print(" BPM=");
      Serial.println(beatsPerMinute);
    }
  }
}
