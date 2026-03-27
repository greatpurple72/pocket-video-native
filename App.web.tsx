import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const demoVideos = [
  {
    id: 'bili-demo',
    title: 'B站视频示例：4x 倍速看片',
    url: 'https://www.bilibili.com/video/BV-demo',
  },
  {
    id: 'baidu-demo',
    title: '百度搜索结果页视频示例',
    url: 'https://www.baidu.com/s?wd=视频',
  },
];

const demoDownloads = [
  {
    id: 'offline-demo',
    title: '离线缓存示例视频',
    fileUri: 'file:///video-downloads/demo-video.mp4',
  },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.phoneShell}>
        <View style={styles.header}>
          <Text style={styles.brand}>Pocket Video</Text>
          <Text style={styles.caption}>iOS 预览壳页面</Text>
          <View style={styles.addressRow}>
            <Pressable style={styles.navButton}>
              <Text style={styles.navText}>{'<'}</Text>
            </Pressable>
            <Pressable style={styles.navButton}>
              <Text style={styles.navText}>{'>'}</Text>
            </Pressable>
            <TextInput value="https://www.bilibili.com" editable={false} style={styles.input} />
            <Pressable style={styles.goButton}>
              <Text style={styles.goButtonText}>打开</Text>
            </Pressable>
          </View>
          <Text style={styles.status}>这是 Web 预览壳，用来展示 iOS App 的界面布局。真机版会把这里换成网页浏览器和视频检测。</Text>
        </View>

        <View style={styles.webFrame}>
          <View style={styles.webHero}>
            <Text style={styles.webHeroTitle}>网页区域</Text>
            <Text style={styles.webHeroText}>这里在 iPhone 版里会显示 B 站、百度结果页或你输入的网址。</Text>
            <View style={styles.fakeVideo}>
              <Text style={styles.fakeVideoText}>检测到网页视频，可切全屏播放</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>网页视频</Text>
            {demoVideos.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.url}</Text>
                <View style={styles.cardActions}>
                  <Pressable style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>全屏播放</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>预下载</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>离线下载</Text>
            {demoDownloads.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.fileUri}</Text>
                <View style={styles.cardActions}>
                  <Pressable style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>离线播放</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>删除</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tipPanel}>
            <Text style={styles.tipTitle}>全屏手势设计</Text>
            <Text style={styles.tipText}>左半边上下滑动调亮度</Text>
            <Text style={styles.tipText}>右半边上下滑动调音量</Text>
            <Text style={styles.tipText}>长按临时倍速，长按时上下滑调倍速</Text>
            <Text style={styles.tipText}>双击暂停 / 播放</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#d8e1e8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  phoneShell: {
    width: 390,
    height: 844,
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor: '#f4efe6',
    borderWidth: 10,
    borderColor: '#182531',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#102a43',
  },
  caption: {
    marginTop: 4,
    color: '#486581',
    fontSize: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9e2ec',
  },
  navText: {
    color: '#102a43',
    fontWeight: '700',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fffaf1',
    borderWidth: 1,
    borderColor: '#bcccdc',
    paddingHorizontal: 14,
    color: '#102a43',
  },
  goButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d6451b',
  },
  goButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  status: {
    marginTop: 10,
    color: '#7b8794',
    fontSize: 12,
    lineHeight: 18,
  },
  webFrame: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#081521',
    minHeight: 220,
  },
  webHero: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
    backgroundColor: '#102a43',
  },
  webHeroTitle: {
    color: '#f0b429',
    fontSize: 16,
    fontWeight: '800',
  },
  webHeroText: {
    color: '#d9e2ec',
    lineHeight: 20,
  },
  fakeVideo: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#1f3a56',
    borderWidth: 1,
    borderColor: '#486581',
  },
  fakeVideoText: {
    color: '#fff',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  panel: {
    backgroundColor: '#fffaf1',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9dcc9',
  },
  panelTitle: {
    color: '#102a43',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e6ecf2',
    padding: 14,
    marginTop: 10,
  },
  cardTitle: {
    color: '#102a43',
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 6,
    color: '#7b8794',
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102a43',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0b429',
  },
  secondaryButtonText: {
    color: '#102a43',
    fontWeight: '700',
  },
  tipPanel: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#102a43',
  },
  tipTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  tipText: {
    color: '#d9e2ec',
    lineHeight: 20,
  },
});
