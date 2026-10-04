import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedText } from '@/components/ThemedText';
import { radii, spacing } from '@/theme';

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const { fonts } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.navSurface,
            paddingBottom: spacing.sm + insets.bottom,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 -10px 28px rgba(0,0,0,0.28)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 18 }),
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const iconColor = focused ? colors.onAccent : colors.navInactive;
          const icon = options.tabBarIcon?.({ focused, color: iconColor, size: 22 });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: colors.navActive }]}>
                {icon}
              </View>
              <ThemedText
                variant="tiny"
                color={focused ? '#ffffff' : colors.navInactive}
                style={{ fontFamily: fonts.semibold, marginTop: 2 }}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loan"
        options={{
          title: t('tabs.loan'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    minHeight: 66,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
